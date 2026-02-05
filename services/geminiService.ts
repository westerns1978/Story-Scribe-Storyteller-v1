// This service is deprecated as of the new backend integration.
// All Gemini API calls are now handled by the server-side application
// available at https://memoryscribe-test-286939318734.us-west1.run.app.
//
// Please use the new `services/api.ts` module for all backend communication.

// FIX: Make this file a module and provide the diarizeTranscript function
// by calling the new centralized API service.
import { diarize } from './api';

export const diarizeTranscript = async (transcript: string): Promise<string> => {
    // This is a passthrough to the new API service, as per deprecation notice.
    return diarize(transcript);
};
