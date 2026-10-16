/**
 * Recorded voices that replace text-to-speech line by line, keyed by phrase
 * key (`<lang>:<line id>`), e.g.
 *
 *   'kn:auto.1': require('../../../assets/voice/kn/auto.1.m4a'),
 *
 * Empty in v1: every line is read by the device's own voice. When native
 * speakers record lines, add them here and the players use them first.
 */
export const AUDIO: Readonly<Record<string, number>> = {};
