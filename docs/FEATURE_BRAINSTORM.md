# Watchwyrd Feature Brainstorm

> 5 rounds of Six Thinking Hats analysis to discover novel features

## Round 1: Mood & Emotional Context

### 🎩 White Hat (Facts)
- Current system uses: time, weather, location, genres
- Users often choose content based on emotional state
- Streaming platforms like Netflix/Spotify use mood-based recommendations
- No current way to capture user's emotional context

### 🎩 Red Hat (Feelings)
- "I want to watch something that matches how I feel RIGHT NOW"
- Frustration when recommendations don't fit current mood
- Excitement at the idea of truly personalized suggestions
- Comfort in being understood by the system

### 🎩 Black Hat (Caution)
- Mood is subjective and hard to capture accurately
- Users might not want to share emotional state
- Could feel intrusive or "creepy"
- Mood changes during content selection

### 🎩 Yellow Hat (Benefits)
- Much more relevant recommendations
- Emotional connection with the addon
- Differentiation from all other addons
- Could help users discover content they'd never find otherwise

### 🎩 Green Hat (Creativity)
- **Mood Slider**: Simple emoji-based mood picker (😊😢😤😴🎉)
- **Quick Mood Presets**: "Stressed after work", "Lazy Sunday", "Need a laugh"
- **Mood + Weather Combo**: Rainy day + feeling cozy = specific vibe
- **Anti-Mood**: "I feel sad but want to feel better" vs "I want to lean into it"

### 🎩 Blue Hat (Summary)
**Feature: Mood Context Integration**
- Add optional mood picker to configure wizard
- Simple 5-7 mood options with emojis
- Include "improve my mood" toggle
- Pass mood context to AI for enhanced recommendations

---

## Round 2: Social & Companion Viewing

### 🎩 White Hat (Facts)
- 70%+ of streaming is done with others (couples, families, friends)
- Current system optimizes for single viewer
- Group viewing requires compromise on preferences
- No way to specify viewing companion context

### 🎩 Red Hat (Feelings)
- "We can never agree on what to watch"
- Joy when finding something everyone loves
- Anxiety about picking wrong content for group
- Desire to impress date with perfect movie choice

### 🎩 Green Hat (Creativity)
- **Companion Mode**: "Watching with..." dropdown
  - Solo / Partner / Kids / Friends / Family / Date Night
- **Age Appropriateness**: Auto-adjust content based on youngest viewer
- **Compromise Engine**: "Partner likes romance, I like action" → action-romance hybrids
- **Group Size Slider**: Different recs for 2 people vs party of 10
- **Guest Profile**: Quick add temporary viewer preferences

### 🎩 Yellow Hat (Benefits)
- Solves real-world viewing problem
- Increases relevance dramatically
- Reduces decision paralysis for groups
- Unique selling point vs other addons

### 🎩 Black Hat (Caution)
- Adds complexity to UI
- Partner preferences need separate input
- Privacy concerns with multiple profiles
- Could slow down quick recommendations

### 🎩 Blue Hat (Summary)
**Feature: Companion-Aware Recommendations**
- Add "Who's watching?" quick selector
- Presets: Solo, Date, Kids Present, Friend Group, Family
- Optional: Brief partner preference input
- AI adjusts recommendations for group dynamics

---

## Round 3: Temporal & Duration Context

### 🎩 White Hat (Facts)
- Current system knows time of day
- Doesn't know user's available time
- Movie lengths vary: 90min to 3+ hours
- Series commitment varies: 20min episodes to 1hr+
- Users often have specific time windows

### 🎩 Red Hat (Feelings)
- Frustration starting a 3hr movie at 11pm
- Satisfaction finding perfect length content
- Anxiety about commitment to long series
- Relief when something fits the time slot perfectly

### 🎩 Green Hat (Creativity)
- **Time Budget**: "I have X minutes" slider (30min to 3hr+)
- **Bedtime Mode**: "I need to sleep by..." → calculates available time
- **Binge Potential**: "Want to binge?" toggle for series
- **Episode Length Filter**: Prefer 20min, 45min, or 60min episodes
- **Completion Estimate**: "You can finish this tonight"
- **Work Break Mode**: Quick 25min content for lunch breaks
- **Flight Mode**: "I have a 4hr flight" → perfect length queue

### 🎩 Yellow Hat (Benefits)
- Practical utility users will love
- Reduces abandoned content
- Better content completion rates
- Unique feature not seen elsewhere

### 🎩 Black Hat (Caution)
- Adds another input to wizard
- Time estimates aren't always accurate
- Some users want to ignore time constraints
- Could limit discovery of longer gems

### 🎩 Blue Hat (Summary)
**Feature: Time-Aware Recommendations**
- Add optional "Available time" input
- Quick presets: Quick (30-60min), Standard (90-120min), Epic (2hr+)
- For series: Episode length preference
- AI factors duration into recommendations

---

## Round 4: Discovery & Serendipity Controls

### 🎩 White Hat (Facts)
- Current system has "For Now" (contextual) and "Random" (surprise)
- Users have different discovery appetites
- Algorithm bubbles are a known problem
- Some users want safe choices, others want adventures

### 🎩 Red Hat (Feelings)
- Thrill of discovering hidden gems
- Comfort in reliable recommendations
- Boredom with same-old suggestions
- Fear of wasting time on bad content

### 🎩 Green Hat (Creativity)
- **Adventure Dial**: Slider from "Safe Picks" to "Wild Cards"
- **Decade Explorer**: "Show me gems from the 80s/90s/2000s"
- **Country Hopper**: "Surprise me with Korean/French/Indian cinema"
- **Anti-Mainstream Toggle**: "No top 100 movies"
- **Guilty Pleasure Mode**: "I know it's bad but..."
- **Critics vs Audience**: Prioritize Rotten Tomatoes vs IMDB ratings
- **Hidden Gems Only**: Under X reviews but highly rated
- **Rewatch Worthy**: Content great for rewatching
- **One-Time Watch**: Intense content you'd never rewatch

### 🎩 Yellow Hat (Benefits)
- Breaks filter bubbles
- Caters to different discovery styles
- Encourages exploration
- Makes addon more engaging over time

### 🎩 Black Hat (Caution)
- Too many options overwhelm users
- "Wild cards" might frustrate some
- Hard to define "hidden gem" objectively
- Could conflict with genre preferences

### 🎩 Blue Hat (Summary)
**Feature: Discovery Style Controls**
- Add "Adventure Level" slider (1-5)
- Optional decade preference
- "Hidden gems only" toggle
- AI adjusts novelty/safety balance accordingly

---

## Round 5: Context Memory & Learning

### 🎩 White Hat (Facts)
- Current system is stateless (no memory between sessions)
- Can't learn from user behavior
- No way to track what user has already seen
- Each recommendation is independent

### 🎩 Red Hat (Feelings)
- Annoyance seeing same recommendations repeatedly
- Desire for system that "knows me"
- Satisfaction when recommendations improve over time
- Trust in a system that learns

### 🎩 Green Hat (Creativity)
- **Quick Feedback**: 👍👎 on recommendations (stored locally)
- **"Already Seen" Tracker**: Local storage of viewed content
- **Favorites List**: Influence future recommendations
- **Dislike Forever**: Never recommend this again
- **Director/Actor Affinity**: "More like Christopher Nolan"
- **Trope Preferences**: "Love plot twists", "Hate cliffhangers"
- **Recommendation History**: What was recommended when
- **Seasonal Memory**: "Last Christmas you watched..."
- **Collaborative Insight**: Optional anonymous data for better AI

### 🎩 Yellow Hat (Benefits)
- Recommendations improve over time
- Reduces repetition frustration
- Creates personal connection
- Competitive advantage

### 🎩 Black Hat (Caution)
- Local storage has limits
- Privacy concerns with any tracking
- Complexity of implementation
- Browser clearing loses data

### 🎩 Blue Hat (Summary)
**Feature: Preference Memory**
- Local-only storage (privacy-first)
- Simple thumbs up/down on results
- "Already watched" marking
- AI includes recent feedback in prompts

---

## Bonus Ideas (Cross-Cutting)

### 🎬 Content-Specific Features
- **Soundtrack Lovers**: Movies with great music
- **Visual Feast**: Cinematography-focused picks
- **Dialogue Heavy**: For word lovers
- **Action Packed**: Minimal dialogue, maximum action
- **Twist Endings**: Guaranteed surprise
- **Based on True Story**: Reality-inspired content

### 🌍 Cultural & Events
- **Oscar Season**: Award contenders
- **Holiday Themes**: Beyond Christmas
- **Sports Events**: World Cup → soccer movies
- **Historical Date**: "Movies about events from today's date"
- **Pop Culture Moment**: Trending topics

### 🎯 Intent-Based Queries
- **"Teach me something"**: Documentary mode
- **"Make me think"**: Philosophical/thought-provoking
- **"Pure escapism"**: Turn brain off
- **"Background watching"**: Light content while working
- **"Full attention"**: Demanding, rewarding content

### 🤝 Social Features
- **Share Recommendation**: Generate shareable link
- **Watch Party Sync**: Same catalog for friends
- **Challenge Mode**: "Watch something you'd never pick"

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Mood Context | High | Low | ⭐⭐⭐⭐⭐ |
| Companion Mode | High | Low | ⭐⭐⭐⭐⭐ |
| Time Budget | High | Low | ⭐⭐⭐⭐⭐ |
| Adventure Dial | Medium | Low | ⭐⭐⭐⭐ |
| Decade Explorer | Medium | Low | ⭐⭐⭐⭐ |
| Preference Memory | High | Medium | ⭐⭐⭐⭐ |
| Quick Feedback | Medium | Medium | ⭐⭐⭐ |
| Intent Queries | Medium | Low | ⭐⭐⭐ |
| Content Tropes | Low | Medium | ⭐⭐ |
| Social Features | Medium | High | ⭐⭐ |

---

## Top 5 Recommended Features

### 1. 🎭 Mood Picker
**Why**: Emotional context is the #1 missing piece. Simple to implement, massive impact.
```
How are you feeling?
😊 Happy  😢 Sad  😤 Stressed  😴 Tired  🎉 Excited  🤔 Thoughtful
```

### 2. 👥 Who's Watching
**Why**: Solves universal "group viewing" problem. Quick input, smart output.
```
Who's watching?
🧑 Solo  💑 Date  👨‍👩‍👧 Family  👶 Kids Present  🍻 Friends
```

### 3. ⏱️ Time Available
**Why**: Practical utility that prevents bad recommendations.
```
How much time do you have?
⚡ Quick (< 1hr)  🎬 Standard (1-2hr)  🍿 Epic (2hr+)  ♾️ No limit
```

### 4. 🎲 Adventure Level
**Why**: Balances safe/discovery without complex UI.
```
Discovery style?
🛡️ Safe ────────●──────── 🎲 Adventurous
```

### 5. 📅 Decade Preference
**Why**: Easy nostalgia trigger, unique filtering.
```
Any era preference?
🕺 70s  🎸 80s  💿 90s  📱 2000s  📲 2010s  🆕 Recent  🎰 Any
```

---

## Quick Wins (Low Effort, High Delight)

1. **Emoji-based mood picker** - 5 icons, huge impact
2. **"Watching with kids" toggle** - Single checkbox, smart filtering  
3. **"No movies over 2 hours" toggle** - Simple, practical
4. **"Hidden gems only" toggle** - One checkbox, different results
5. **"Feeling nostalgic" toggle** - Triggers 80s/90s content

---

*Document generated: January 2026*
*Framework: Six Thinking Hats × 5 Rounds*
