/**
 * Watchwyrd - Docker Image Tests
 *
 * Tests to verify the Docker image builds and runs correctly.
 * These tests require Docker to be available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawn, type ChildProcess } from 'child_process';

const DOCKER_IMAGE = 'watchwyrd-test';
const CONTAINER_NAME = 'watchwyrd-test-container';
const TEST_PORT = 7099;

/**
 * Check if Docker is available
 */
function isDockerAvailable(): boolean {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for container to be healthy
 */
async function waitForHealthy(
  containerName: string,
  timeoutMs = 30000
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const result = execSync(
        `docker inspect --format='{{.State.Health.Status}}' ${containerName}`,
        { stdio: 'pipe', encoding: 'utf-8' }
      ).trim();

      if (result === 'healthy') {
        return true;
      }
    } catch {
      // Container might not exist yet
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Clean up test container
 */
function cleanup(): void {
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'pipe' });
  } catch {
    // Ignore if container doesn't exist
  }
}

describe.skipIf(!isDockerAvailable())('Docker Image', () => {
  beforeAll(() => {
    cleanup();
  });

  afterAll(() => {
    cleanup();
  });

  it('should build the Docker image', () => {
    const result = execSync(`docker build -t ${DOCKER_IMAGE} .`, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 120000, // 2 minutes
    });

    expect(result).toContain('Successfully');
  }, 120000);

  it('should run the container and respond to health check', async () => {
    // Start container
    execSync(
      `docker run -d --name ${CONTAINER_NAME} -p ${TEST_PORT}:7000 -e SECRET_KEY=test-secret-key-for-docker-tests ${DOCKER_IMAGE}`,
      { stdio: 'pipe' }
    );

    // Wait for healthy
    const isHealthy = await waitForHealthy(CONTAINER_NAME, 30000);
    expect(isHealthy).toBe(true);

    // Test health endpoint
    const response = await fetch(`http://localhost:${TEST_PORT}/health`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  }, 60000);

  it('should serve the configure page', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/configure`);
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain('Watchwyrd');
  });

  it('should serve the manifest without config', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/manifest.json`);
    expect(response.status).toBe(200);

    const manifest = await response.json();
    expect(manifest.id).toBe('community.watchwyrd');
    expect(manifest.name).toBe('Watchwyrd');
  });

  it('should return proper security headers', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/configure`);

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });
});
