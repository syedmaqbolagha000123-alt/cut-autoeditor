/**
 * MAQ AUTO EDITOR ULTRA - Audio Ducking & Mixing Engine
 * Prioritizes voiceover clarity by dynamically calculating attenuation envelopes for music and SFX.
 */

class AudioDuckingService {
  /**
   * Calculate FFmpeg filter complex string for multi-track audio mixing with sidechain ducking
   * @param {{
   *   voiceoverPath: string,
   *   musicClips: Array<any>,
   *   sfxClips: Array<any>,
   *   inputIndexOffset?: number,
   *   duckingStrengthDB?: number,
   *   voiceoverVolume?: number,
   *   musicVolume?: number,
   *   sfxVolume?: number,
   *   totalDuration?: number
   * }} params 
   * @returns {{ filterComplex: string, inputArgs: string[], outputMap: string }}
   */
  static buildAudioFilterGraph(params) {
    const {
      voiceoverPath,
      musicClips = [],
      sfxClips = [],
      inputIndexOffset = 0,
      duckingStrengthDB = -18,
      voiceoverVolume = 1.0,
      musicVolume = 0.35,
      sfxVolume = 0.7,
      totalDuration = 30.0
    } = params;

    const inputArgs = [];
    let inputIdx = inputIndexOffset;

    // Track input indices
    let voIndex = -1;
    if (voiceoverPath) {
      inputArgs.push('-i', voiceoverPath);
      voIndex = inputIdx++;
    }

    const musicIndices = [];
    musicClips.forEach(m => {
      inputArgs.push('-i', m.path);
      musicIndices.push({ index: inputIdx++, clip: m });
    });

    const sfxIndices = [];
    sfxClips.forEach(s => {
      inputArgs.push('-i', s.path);
      sfxIndices.push({ index: inputIdx++, clip: s });
    });

    // If zero audio inputs provided, generate silence
    if (voIndex === -1 && musicIndices.length === 0 && sfxIndices.length === 0) {
      return {
        filterComplex: `anullsrc=r=48000:cl=stereo,atrim=duration=${totalDuration}[aout]`,
        inputArgs: [],
        outputMap: '[aout]'
      };
    }

    // Build filter expressions
    const filterParts = [];
    const mixInputs = [];

    // Process Voiceover
    if (voIndex !== -1) {
      if (musicIndices.length > 0) {
        // Split voiceover into two streams: one for sidechain ducking detector, one for main audio mix
        filterParts.push(`[${voIndex}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${voiceoverVolume},apad,atrim=0:${totalDuration},asplit=2[vo_sidechain][vo_main]`);
        mixInputs.push('[vo_main]');
      } else {
        filterParts.push(`[${voIndex}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${voiceoverVolume},apad,atrim=0:${totalDuration}[vo_main]`);
        mixInputs.push('[vo_main]');
      }
    }

    // Process Music with optional ducking
    if (musicIndices.length > 0) {
      const musicTracks = [];
      musicIndices.forEach(({ index, clip }) => {
        const delayMs = Math.round(clip.startTime * 1000);
        const vol = (clip.volume !== undefined ? clip.volume : 1.0) * musicVolume;
        filterParts.push(`[${index}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${delayMs}|${delayMs},volume=${vol.toFixed(3)}[m_track_${index}]`);
        musicTracks.push(`[m_track_${index}]`);
      });

      if (musicTracks.length > 1) {
        filterParts.push(`${musicTracks.join('')}amix=inputs=${musicTracks.length}:dropout_transition=0:normalize=0[music_mixed]`);
      } else {
        filterParts.push(`${musicTracks[0]}anull[music_mixed]`);
      }

      // Apply sidechain ducking if voiceover exists
      if (voIndex !== -1) {
        const ratio = Math.min(Math.max(Math.abs(duckingStrengthDB) / 4, 2), 12);
        filterParts.push(`[music_mixed][vo_sidechain]sidechaincompress=threshold=0.1:ratio=${ratio}:attack=20:release=300[music_ducked]`);
        mixInputs.push('[music_ducked]');
      } else {
        mixInputs.push('[music_mixed]');
      }
    }

    // Process SFX Clips
    if (sfxIndices.length > 0) {
      const sfxTracks = [];
      sfxIndices.forEach(({ index, clip }) => {
        const delayMs = Math.round(clip.startTime * 1000);
        const vol = (clip.volume !== undefined ? clip.volume : 1.0) * sfxVolume;
        filterParts.push(`[${index}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${delayMs}|${delayMs},volume=${vol.toFixed(3)}[sfx_track_${index}]`);
        sfxTracks.push(`[sfx_track_${index}]`);
      });

      if (sfxTracks.length > 1) {
        filterParts.push(`${sfxTracks.join('')}amix=inputs=${sfxTracks.length}:dropout_transition=0:normalize=0[sfx_mixed]`);
        mixInputs.push('[sfx_mixed]');
      } else {
        mixInputs.push(sfxTracks[0]);
      }
    }

    // Final Mix capped strictly at totalDuration
    if (mixInputs.length > 1) {
      filterParts.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${totalDuration}[aout]`);
    } else if (mixInputs.length === 1) {
      filterParts.push(`${mixInputs[0]}loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${totalDuration}[aout]`);
    } else {
      filterParts.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${totalDuration}[aout]`);
    }

    return {
      filterComplex: filterParts.join(';'),
      inputArgs,
      outputMap: '[aout]'
    };
  }
}

module.exports = AudioDuckingService;
