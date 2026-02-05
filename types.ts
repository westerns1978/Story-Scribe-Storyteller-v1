
// types.ts
import React from 'react';

export type UserTier = 'free' | 'photo_pack' | 'memory_collection' | 'full_story_scribe';

export interface Customer {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  credits: {
    photos: number;
    stories: number;
  };
  joinedAt: string;
  is_admin?: boolean;
}

export interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  systemInstruction: string;
  apiProvider: string;
  model: string;
}

export interface Extraction {
  field_name: string;
  extracted_value: string | number | boolean;
  confidence: number;
  review_status: 'verified' | 'needs_review';
  source_span: string;
}

export interface ExtractionResponse {
  extractions: Extraction[];
}

export interface PresentationSlide {
  type: 'title' | 'content' | 'quote' | 'timeline' | 'image';
  title?: string;
  subtitle?: string;
  content?: string | string[];
  quote?: string;
  author?: string;
  timelineEvents?: { year: string; event: string }[];
  imageUrl?: string;
  imageIndex?: number;
  caption?: string;
}

export interface StoryBeat {
  beat_title: string;
  narrative_chunk: string;
  image_index: number;
  themes: string[];
  directors_notes: string;
  visual_focus: string;
}

export interface Storyboard {
  story_beats: StoryBeat[];
  visual_dna?: string;
}

export interface AuroraPrompt {
  timeline: string;
  atmosphere: string;
  environment: string;
  scanline_prompt: string;
}

export interface Enhancement {
  suggestion: string;
  location: string;
  priority: 'high' | 'medium' | 'low';
  before_example: string;
  after_example: string;
}

export interface QualityAssessment {
  quality_scores: {
    emotional_depth: number;
    narrative_flow: number;
    authenticity: number;
  };
  strengths: string[];
  missing_elements: string[];
  enhancements?: Enhancement[];
}

export interface Artifact {
  name: string;
  type: 'photo' | 'document' | 'object' | 'recipe' | 'letter';
  description: string;
  era: string;
  image_url?: string;
  image_prompt?: string;
}

export interface StoryExtraction {
  timeline: { 
    year: string; 
    event: string; 
    significance: string; 
    historical_context?: string;
    details?: string; // Evocative sensory details
  }[];
  family: { name: string; relationship: string }[];
  locations: { name: string; type: string; coordinates?: string; intelligence?: string }[];
  key_quotes: string[];
  themes: string[];
  life_lessons: string[];
  sensory_details: string[];
  emotions: string[];
  storyteller: { name: string };
  summary?: string;
  emotional_journey?: {
    overall_tone: string;
    current_state: string;
    turning_points: string[];
  };
  presentation_structure?: {
    presentation_title: string;
    slides: PresentationSlide[];
  };
  storyboard?: Storyboard; 
  aurora_prompts?: AuroraPrompt[]; 
  artifacts?: Artifact[];
  metadata?: {
      confidence_score?: number;
      missing_info?: string[];
      ai_reasoning_log?: string[];
  };
}

export interface GeneratedImage {
  index: number;
  success: boolean;
  image_url: string;
  video_url?: string; 
  prompt: string;
  provider?: string;
  error?: string;
  scene?: string;
}

export interface StatusTracker {
  extracting: boolean;
  generatingImages: boolean;
  generatingVideo: boolean;
  downloadingPdf: boolean;
  refiningNarrative: boolean;
  generatingPresentation: boolean;
}

export interface ActiveStory {
  savedAt: string | null;
  sessionId: string;
  storytellerName: string;
  narrative: string | null;
  generatedImages: GeneratedImage[];
  extraction: StoryExtraction | null;
  background_music_url?: string;
  recordingUrl?: string;
  videoUrl?: string;
  storyboard?: Storyboard;
  artifacts?: Artifact[]; 
  aurora_prompts?: AuroraPrompt[]; 
  enhancedPhotos?: Record<string, string>;
  qualityAssessment?: QualityAssessment;
  videoPrompts?: string[];
  transcriptSegments?: TranscriptSegment[];
  summary?: string;
}

export interface StoryArchiveItem extends ActiveStory {
  id: string;
  name: string;
  savedAt: string;
  summary?: string;
  isSynced?: boolean;
}

export interface NeuralAsset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  public_url: string;
  uploaded_at: string;
  metadata: {
    title?: string;
    summary?: string;
    dna_extracted?: boolean;
  };
}

export type AutomatedProgress = 'agent_scribe' | 'agent_cartographer' | 'agent_illustrator' | 'agent_director' | 'complete' | null;

export interface QueueItem {
  id: string;
  file: File;
  type: 'text' | 'image' | 'pdf' | 'audio';
  summary?: string;
}

export interface ConnectivitySettings {
  backendUrl: string;
  pixabayApiKey: string;
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  gemini: string;
  supabase: string;
  providers_registered?: string[];
}

export interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  duration: number;
  url: string;
}

export interface StorybookPage {
  title: string;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
  provider?: string;
  year?: string;
  videoUrl?: string;
}

export interface ProviderStat {
  name: string;
  success: number;
  failures: number;
}

export interface GenerateImagesResponse {
  images: GeneratedImage[];
  successful: number;
  total: number;
  provider_stats: ProviderStat[];
}

export interface ConnieMessage {
  role: 'user' | 'model';
  text: string;
  actions?: { label: string; value: string }[];
}

export interface VisualizationResponse {
  storybook: {
    extraction: StoryExtraction;
    narrative: string;
  };
  session_id: string;
}

export interface ActiveResult {
  name: string;
  result: ExtractionResponse;
  summary?: string;
  generatedImages?: GeneratedImage[];
}

export interface ExtractResponse {
    session_id: string;
    narrative: string;
    extraction: StoryExtraction;
    images: GeneratedImage[];
    storyboard?: Storyboard;
    artifacts?: Artifact[];
}

export interface SampleStory {
  name: string;
  description: string;
  thumbnail: string;
  assets: {
    images: string[];
    storyUrl: string;
    elementsUrl: string;
  };
}

export type DiagnosticStatus = 'verified' | 'needs_review' | 'flagged' | 'omitted';

export interface AnalysisResult {
  documentTitle: string;
  summary: string;
  complianceScore: number;
  items: {
    title: string;
    description: string;
    status: DiagnosticStatus;
    priority?: 'high' | 'medium' | 'low';
    recommendation?: string;
  }[];
}
