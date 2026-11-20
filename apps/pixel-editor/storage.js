// 그림·설정 저장소
//
// localStorage는 시크릿 모드나 차단 설정에서 예외를 던질 수 있으므로
// 모든 접근을 try/catch로 감싼다. 값 검증은 editor.js의 순수 함수에 맡긴다.

import { serializeDrawing, parseDrawing, parseSettings, defaultSettings } from './editor.js';

const DRAWING_KEY = 'pixel-editor:drawing';
const SETTINGS_KEY = 'pixel-editor:settings';
const PROBE_KEY = 'pixel-editor:probe';

// 저장된 그림. 없거나 읽기 실패·이상한 값이면 null
export function loadDrawing() {
  try {
    const raw = localStorage.getItem(DRAWING_KEY);
    if (raw === null) return null;
    return parseDrawing(raw);
  } catch (error) {
    return null;
  }
}

// 그림 저장. 실패하면 false (예외를 밖으로 던지지 않음)
export function saveDrawing(pixels) {
  try {
    localStorage.setItem(DRAWING_KEY, serializeDrawing(pixels));
    return true;
  } catch (error) {
    return false;
  }
}

// 저장된 설정. 이상한 필드는 기본값으로 바뀐다.
export function loadSettings() {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch (error) {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    return false;
  }
}

// 시작 시 한 번 쓰고 지워 보는 방식으로 저장 가능 여부를 확인한다.
export function isStorageAvailable() {
  try {
    localStorage.setItem(PROBE_KEY, '1');
    localStorage.removeItem(PROBE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}
