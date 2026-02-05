// This utility contains functions for client-side audio processing

/**
 * Decodes a base64 string into a Uint8Array.
 */
export const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

/**
 * Decodes raw PCM data into an AudioBuffer.
 * Gemini TTS returns raw PCM data, not a standard file format.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Writes a string to a DataView object at a specified offset.
 */
const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
};

/**
 * Encodes audio samples into a WAV file format.
 */
const encodeWAV = (samples: Float32Array, sampleRate: number): DataView => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return view;
};

export const createWavBlobUrl = (base64Audio: string, sampleRate: number): string => {
    const audioBytes = decode(base64Audio);
    const audioDataInt16 = new Int16Array(audioBytes.buffer);
    const audioDataFloat32 = new Float32Array(audioDataInt16.length);

    for (let i = 0; i < audioDataInt16.length; i++) {
        audioDataFloat32[i] = audioDataInt16[i] / 32768.0;
    }

    const wavDataView = encodeWAV(audioDataFloat32, sampleRate);
    const wavBlob = new Blob([wavDataView], { type: 'audio/wav' });
    
    return URL.createObjectURL(wavBlob);
};
