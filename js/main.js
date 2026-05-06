/* ============================================
   INNOBGM Landing Page - Main JS
   - 음악 5종 실제 음원 재생 (m4a)
   - 보이스 6종 시뮬레이션 (음원 업로드 대기)
   - D-Day 카운트다운, 부드러운 앵커 스크롤, 헤더 그림자
   ============================================ */

(function () {
  'use strict';

  // -----------------------------------------------------
  // 0) 음원 매핑 테이블
  //    - m0~m4: 음악 5종 (실제 m4a 파일 연결)
  //    - v0~v5: 보이스 6종 (추후 음원 업로드 시 연결)
  // -----------------------------------------------------
  const TRACK_SRC = {
    // 음악 5종
    m0: 'audio/music/sample-1-national.m4a',     // 국민 응원가
    m1: 'audio/music/sample-2-trendy.m4a',       // 트렌디 캠페인
    m2: 'audio/music/sample-3-emotional.mp3',    // 감성 메시지
    m3: 'audio/music/sample-4-family.m4a',       // 온 가족 캠페인
    m4: 'audio/music/sample-5-remake.m4a',       // 리메이크 응원가
    // 보이스 6종 (카드 배치 순)
    v0: 'audio/voice/voice-energy-female.m4a',   // 에너지 · 여성
    v1: 'audio/voice/voice-energy-male.m4a',     // 에너지 · 남성
    v2: 'audio/voice/voice-warmth-female.m4a',   // 다정함 · 여성
    v3: 'audio/voice/voice-warmth-male.m4a',     // 다정함 · 남성
    v4: 'audio/voice/voice-trust-male.m4a',      // 신뢰감 · 남성
    v5: 'audio/voice/voice-calm-female.m4a'      // 신중함 · 여성
  };

  // -----------------------------------------------------
  // 1) Audio 객체 풀 — 트랙 ID별로 1개씩 재사용
  //    preload="none" 으로 페이지 로드 시 다운로드 부하 0
  // -----------------------------------------------------
  const audioPool = {};

  function getAudio(trackId) {
    if (audioPool[trackId]) return audioPool[trackId];

    const src = TRACK_SRC[trackId];
    if (!src) return null; // 음원 미등록 → 시뮬레이션 모드

    const audio = new Audio();
    audio.src = src;
    audio.preload = 'none';
    audio.controlsList = 'nodownload';

    // 자동 정지: 곡이 끝나면 UI도 초기화
    audio.addEventListener('ended', () => {
      if (currentTrack === trackId) {
        currentTrack = null;
        setPlayingUI(null);
      }
    });

    // 에러 처리: 네트워크 문제 등으로 재생 실패 시 UI 복구
    audio.addEventListener('error', () => {
      console.warn('[INNOBGM] 음원 로드 실패:', src);
      if (currentTrack === trackId) {
        currentTrack = null;
        setPlayingUI(null);
      }
    });

    audioPool[trackId] = audio;
    return audio;
  }

  // -----------------------------------------------------
  // 2) 재생 상태 통합 관리
  //    - 한 번에 하나의 트랙만 재생
  //    - 같은 트랙ID를 가진 모든 UI 요소 동기화 (히어로 타일 ↔ 샘플 행)
  // -----------------------------------------------------
  let currentTrack = null;

  function setPlayingUI(trackId) {
    // 모든 재생 상태 초기화
    document.querySelectorAll('.tile.playing, .sample-row.playing, .voice-card.playing')
      .forEach(el => el.classList.remove('playing'));

    if (trackId === null) return;

    // 해당 트랙ID의 모든 카드에 playing 클래스 부여
    document.querySelectorAll('[data-track="' + trackId + '"]')
      .forEach(el => el.classList.add('playing'));
  }

  function stopAllAudio() {
    Object.values(audioPool).forEach(a => {
      if (!a.paused) {
        a.pause();
      }
    });
  }

  function handleTrackToggle(e) {
    // 카드 영역 기준으로 동작 (버튼 클릭도 카드로 위임)
    const target = e.currentTarget;
    const trackId = target.getAttribute('data-track');
    if (!trackId) return;

    // 같은 트랙 다시 클릭 → 정지
    if (currentTrack === trackId) {
      stopAllAudio();
      currentTrack = null;
      setPlayingUI(null);
      return;
    }

    // 다른 트랙 클릭 → 기존 정지 후 새 트랙 재생
    stopAllAudio();
    currentTrack = trackId;
    setPlayingUI(trackId);

    const audio = getAudio(trackId);
    if (audio) {
      // 처음부터 재생
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(err => {
          // 자동재생 정책 등으로 실패한 경우
          console.warn('[INNOBGM] 재생 실패:', err);
          currentTrack = null;
          setPlayingUI(null);
        });
      }
    }
    // 음원이 미등록된 트랙(보이스 v0~v5)은 시뮬레이션만 동작
  }

  // 모든 재생 가능한 카드/행에 클릭 이벤트 부여
  document.querySelectorAll('[data-track]').forEach(el => {
    el.addEventListener('click', handleTrackToggle);
  });

  // -----------------------------------------------------
  // 3) 부드러운 앵커 스크롤
  // -----------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id.length <= 1) return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // -----------------------------------------------------
  // 4) D-Day 카운터 (6.3 지방선거: 2026-06-03)
  // -----------------------------------------------------
  function updateDday() {
    const counter = document.getElementById('dday-counter');
    if (!counter) return;

    const electionDate = new Date('2026-06-03T00:00:00+09:00');
    const today = new Date();
    const diff = Math.ceil((electionDate - today) / (1000 * 60 * 60 * 24));

    if (diff <= 0) {
      counter.textContent = 'D-DAY';
      return;
    }
    counter.textContent = 'D-' + diff;
  }
  updateDday();

  // -----------------------------------------------------
  // 5) 헤더 스크롤 시 그림자 효과 (라이트 테마)
  // -----------------------------------------------------
  const nav = document.querySelector('nav.top');
  if (nav) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 8) {
        nav.style.boxShadow = '0 4px 16px rgba(26,26,31,0.06)';
        nav.style.borderBottomColor = 'rgba(26,26,31,0.10)';
      } else {
        nav.style.boxShadow = 'none';
        nav.style.borderBottomColor = 'rgba(26,26,31,0.06)';
      }
    }, { passive: true });
  }

  // -----------------------------------------------------
  // 6) 페이지 이탈 시 재생 중인 음원 정지 (메모리 정리)
  // -----------------------------------------------------
  window.addEventListener('pagehide', stopAllAudio);

})();
