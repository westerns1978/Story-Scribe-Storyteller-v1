#!/usr/bin/env python3
# apply_patch5.py — run from ~/story-scribe

# ── App.tsx: tribute routing ──────────────────────────────────────────────────
path = 'App.tsx'
content = open(path).read()

# 1. Add import
old_import = "import { WelcomeScreen } from './pages/storyteller/WelcomeScreen';"
new_import = """import { WelcomeScreen } from './pages/storyteller/WelcomeScreen';
import { TributeContributePage } from './pages/storyteller/TributeContributePage';"""
if old_import in content:
    content = content.replace(old_import, new_import)
    print("✓ Added TributeContributePage import")
else:
    print("✗ Could not find WelcomeScreen import — add TributeContributePage import manually")

# 2. Add state vars after sharedStory state
old_state = "  const [sharedStory, setSharedStory] = useState<ActiveStory | null>(null);\n  const [isLoadingShared, setIsLoadingShared] = useState(false);"
new_state = """  const [sharedStory, setSharedStory] = useState<ActiveStory | null>(null);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [tributeStoryId, setTributeStoryId] = useState<string | null>(null);
  const [tributeSubject, setTributeSubject] = useState<string>('');"""
if old_state in content:
    content = content.replace(old_state, new_state)
    print("✓ Added tribute state vars")
else:
    print("✗ Could not find sharedStory state — add tribute state vars manually")

# 3. Add tribute URL detection in initializeApp
old_url_check = "      const params = new URLSearchParams(window.location.search);\n      const storyId = params.get('story');"
new_url_check = """      const params = new URLSearchParams(window.location.search);

      // ── TRIBUTE LINK ────────────────────────────────────────────────────
      const tributeId = params.get('tribute');
      const tributeFor = params.get('for');
      if (tributeId) {
        window.history.replaceState({}, '', window.location.pathname);
        setTributeStoryId(tributeId);
        setTributeSubject(tributeFor ? decodeURIComponent(tributeFor) : 'this person');
        setIsInitialized(true);
        return;
      }

      const storyId = params.get('story');"""
if old_url_check in content:
    content = content.replace(old_url_check, new_url_check)
    print("✓ Added tribute URL detection")
else:
    print("✗ Could not find URL check — add tribute detection manually")

# 4. Add tribute render before auth check
old_auth_check = "  if (!isAuthenticated || !user) {\n    return <LandingGate onLogin={handleLogin} />;\n  }"
new_auth_check = """  // ── Tribute contribution view — no auth needed ────────────────────────
  if (tributeStoryId) {
    return (
      <ErrorBoundary>
        <TributeContributePage
          storyId={tributeStoryId}
          storySubject={tributeSubject}
          onDone={() => window.location.href = '/'}
        />
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated || !user) {
    return <LandingGate onLogin={handleLogin} />;
  }"""
if old_auth_check in content:
    content = content.replace(old_auth_check, new_auth_check)
    print("✓ Added tribute render block")
else:
    print("✗ Could not find auth check — add tribute render manually")

open(path, 'w').write(content)

# ── YourStoryScreen.tsx: tribute tab ─────────────────────────────────────────
path2 = 'pages/storyteller/YourStoryScreen.tsx'
content2 = open(path2).read()

# 1. Add TributeWall import
old_import2 = "import { GenerateMovieButton } from '../../components/GenerateMovieButton';"
new_import2 = """import { GenerateMovieButton } from '../../components/GenerateMovieButton';
import { TributeWall } from '../../components/TributeWall';"""
if old_import2 in content2:
    content2 = content2.replace(old_import2, new_import2)
    print("✓ Added TributeWall import to YourStoryScreen")
else:
    print("✗ Could not find GenerateMovieButton import")

# 2. Add tribute tab to TABS array
old_tabs = "    { id: 'insights' as DetailTab,    label: 'Insights',    emoji: '✦',  show: hasInsights },"
new_tabs = """    { id: 'insights' as DetailTab,    label: 'Insights',    emoji: '✦',  show: hasInsights },
    { id: 'tribute' as DetailTab,     label: 'Tribute',     emoji: '🕯️', show: !isSharedView },"""
if old_tabs in content2:
    content2 = content2.replace(old_tabs, new_tabs)
    print("✓ Added tribute tab to TABS")
else:
    # Try alternate format
    old_tabs2 = "{ id: 'insights' as DetailTab,"
    idx = content2.find(old_tabs2)
    if idx > 0:
        print(f"  TABS insights line found at {idx} — add tribute tab manually after it")
    else:
        print("✗ Could not find TABS insights entry")

# 3. Add tribute tab content after insights block
old_insights_end = "        {activeTab === 'heirlooms' && <div className=\"h-full w-full\"><HeirloomsGallery artifacts={story.artifacts || []} /></div>}"
new_insights_end = """        {activeTab === 'heirlooms' && <div className=\"h-full w-full\"><HeirloomsGallery artifacts={story.artifacts || []} /></div>}
        {activeTab === 'tribute' && (
          <div className=\"h-full w-full overflow-y-auto bg-heritage-cream\">
            <TributeWall storyId={story.sessionId} storySubject={story.storytellerName || 'them'} />
          </div>
        )}"""
if old_insights_end in content2:
    content2 = content2.replace(old_insights_end, new_insights_end)
    print("✓ Added tribute tab content")
else:
    print("✗ Could not find heirlooms tab — add tribute tab content manually")

# 4. Add Invite Memories button next to Share button
old_share_btn = "              <button onClick={handleShareWithFamily} className=\"px-10 py-5 bg-heritage-cream border border-heritage-ink/10 text-heritage-ink font-black rounded-full shadow-sm flex items-center justify-center gap-4 text-xs uppercase tracking-widest hover:bg-heritage-linen transition-all\"><ShareIcon className=\"w-4 h-4\" />{copyFeedback ? 'Link Copied!' : 'Share with Family'}</button>"
new_share_btn = """              <button onClick={handleShareWithFamily} className=\"px-10 py-5 bg-heritage-cream border border-heritage-ink/10 text-heritage-ink font-black rounded-full shadow-sm flex items-center justify-center gap-4 text-xs uppercase tracking-widest hover:bg-heritage-linen transition-all\"><ShareIcon className=\"w-4 h-4\" />{copyFeedback ? 'Link Copied!' : 'Share with Family'}</button>
              {!isSharedView && (
                <button
                  onClick={() => {
                    const url = window.location.origin + '?tribute=' + story.sessionId + '&for=' + encodeURIComponent(story.storytellerName || '');
                    navigator.clipboard.writeText(url).then(() => showToast('Tribute link copied!', 'success'));
                  }}
                  className=\"px-10 py-5 bg-heritage-cream border border-heritage-ink/10 text-heritage-ink font-black rounded-full shadow-sm flex items-center justify-center gap-4 text-xs uppercase tracking-widest hover:bg-heritage-linen transition-all\"
                >🕯️ Invite Memories</button>
              )}"""
if old_share_btn in content2:
    content2 = content2.replace(old_share_btn, new_share_btn)
    print("✓ Added Invite Memories button")
else:
    print("✗ Could not find Share button — add Invite Memories button manually")

open(path2, 'w').write(content2)
print("\n✅ Patch 5 complete")
