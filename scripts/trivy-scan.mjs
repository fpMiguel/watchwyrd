/**
 * Run the Trivy vulnerability scan on the production Docker image.
 *
 * This is the ONLY Trivy entrypoint: local runs (`npm run scan:trivy`) and
 * CI (.github/workflows/ci.yml) execute this same script, so results can
 * never drift between the two. Scan policy lives in `.trivy.yaml`; the
 * scanner version is pinned in TRIVY_VERSION below.
 *
 * Usage:
 *   npm run scan:trivy               # scans watchwyrd:local (builds it first if missing)
 *   SCAN_IMAGE=watchwyrd:<sha> npm run scan:trivy   # scan a specific tag (what CI does)
 *
 * Requirements: a running Docker daemon. No npm dependencies (node builtins only).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TRIVY_VERSION = "0.70.0";
const TRIVY_IMAGE = `aquasec/trivy:${TRIVY_VERSION}`;
const DEFAULT_IMAGE = "watchwyrd:local";
const CACHE_VOLUME = "trivy-cache";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// Docker Desktop on Windows accepts forward-slash absolute paths (C:/...).
const repoMount = rootDir.replace(/\\/g, "/");

function run(cmd, args, opts = {}) {
	const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, ...opts });
	if (res.error) {
		console.error(`failed to start ${cmd}: ${res.error.message}`);
		process.exit(2);
	}
	return res.status ?? 2;
}

function imageExists(ref) {
	const res = spawnSync("docker", ["images", "-q", ref], { encoding: "utf8" });
	return res.status === 0 && res.stdout.trim().length > 0;
}

function main() {
	const target = process.env.SCAN_IMAGE || DEFAULT_IMAGE;

	let code = run("docker", ["info"], { stdio: "ignore" });
	if (code !== 0) {
		console.error(
			"docker daemon is not reachable; start Docker Desktop first.",
		);
		process.exit(2);
	}

	if (!imageExists(target)) {
		console.log(`image ${target} not found locally; building it now...`);
		code = run("docker", ["build", "-t", target, "."], { cwd: rootDir });
		if (code !== 0) {
			console.error(`docker build of ${target} failed.`);
			process.exit(code);
		}
	}

	// Scan the image through the pinned Trivy container. The repo is mounted
	// read-only so the scanner reads .trivy.yaml; the DB cache lives in a
	// named volume so repeat scans skip the database download. The daemon
	// socket lets Trivy read the local image without pushing it anywhere.
	// --exit-code/--no-progress are runner mechanics; policy is in .trivy.yaml.
	code = run("docker", [
		"run",
		"--rm",
		"-v",
		`${repoMount}:/repo:ro`,
		"-v",
		`${CACHE_VOLUME}:/root/.cache`,
		"-v",
		"/var/run/docker.sock:/var/run/docker.sock",
		TRIVY_IMAGE,
		"image",
		"--config",
		"/repo/.trivy.yaml",
		"--exit-code",
		"1",
		"--no-progress",
		target,
	]);
	process.exit(code);
}

main();
