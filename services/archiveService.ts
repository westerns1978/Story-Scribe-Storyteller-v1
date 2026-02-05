import { StoryArchiveItem } from '../types';
import { supabase } from './supabaseClient';

const DEFAULT_ORG_ID = '71077b47-66e8-4fd9-90e7-709773ea6582';

export const getArchivedStories = async (): Promise<StoryArchiveItem[]> => {
  try {
    const { data, error } = await supabase
      .from('storyscribe_stories')
      .select('*')
      .eq('org_id', DEFAULT_ORG_ID)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => {
      const extraction = row.extraction || {};
      const metadata = row.metadata || {};
      
      return {
        id: row.id,
        sessionId: row.session_id || row.id,
        name: row.title || 'Untitled Record',
        storytellerName: row.storyteller_name || row.narrator_name || 'Anonymous',
        savedAt: row.saved_at || row.created_at,
        summary: row.ai_summary || row.summary || extraction.summary,
        narrative: row.content || row.narrative,
        extraction: {
          timeline: extraction.timeline || metadata.timeline || [],
          family: extraction.family || metadata.family || [],
          locations: extraction.locations || metadata.locations || [],
          themes: extraction.themes || row.themes || [],
          key_quotes: extraction.key_quotes || metadata.key_quotes || [],
          life_lessons: extraction.life_lessons || metadata.life_lessons || [],
          sensory_details: extraction.sensory_details || metadata.sensory_details || [],
          emotions: extraction.emotions || metadata.emotions || [],
          storyteller: { name: row.storyteller_name },
          presentation_structure: extraction.presentation_structure || metadata.presentation_structure,
          storyboard: extraction.storyboard || metadata.storyboard || row.storyboard,
          emotional_journey: extraction.emotional_journey || metadata.emotional_journey,
          artifacts: extraction.artifacts || metadata.artifacts || []
        },
        generatedImages: row.generated_images || metadata.images || [],
        videoUrl: row.video_url,
        background_music_url: row.background_music_url,
        artifacts: extraction.artifacts || metadata.artifacts || [],
        enhancedPhotos: row.enhanced_photos,
        isSynced: true,
        storyboard: row.storyboard || metadata.storyboard || extraction.storyboard
      };
    });
  } catch (error) {
    console.error('VAULT_SYNC_FAILURE:', error);
    return [];
  }
};

export async function saveStory(story: StoryArchiveItem): Promise<void> {
  try {
    const payload = {
        id: story.id || story.sessionId,
        session_id: story.sessionId,
        storyteller_name: story.storytellerName,
        narrative: story.narrative,
        extraction: story.extraction, 
        storyboard: story.storyboard || story.extraction?.storyboard, 
        generated_images: story.generatedImages, 
        background_music_url: story.background_music_url,
        org_id: DEFAULT_ORG_ID,
        title: story.name || `Record: ${story.storytellerName}`,
        ai_summary: story.summary || story.extraction?.summary || '',
        video_url: story.videoUrl || '',
        saved_at: story.savedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('storyscribe_stories')
      .upsert(payload, { onConflict: 'id' });
    
    if (error) throw error;
    console.log('✅ VAULT_STABLE: Record committed to neural archive.');
  } catch (err) {
    console.error('VAULT_TRANSMISSION_ERROR:', err);
  }
}

export const deleteStory = async (storyId: string): Promise<void> => {
  try {
    const { error } = await supabase.from('storyscribe_stories').delete().eq('id', storyId);
    if (error) throw error;
  } catch (error) {
    console.error('DELETE_STORY_FAILURE:', error);
    throw error;
  }
};
