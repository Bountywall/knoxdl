// KnoxDL — app.js
// Handles video URL fetching and quality selection UI.

const PROXY_ENDPOINT = 'https://knoxdl.joshast772on.workers.dev/api/fetch';
const DOWNLOAD_ENDPOINT = 'https://knoxdl.joshast772on.workers.dev';

async function fetchVideo() {
  const input = document.getElementById('videoUrl');
  const url = input.value.trim();

  clearResults();

  if (!url) {
    showError('Please paste an X (Twitter) video link first.');
    return;
  }

  if (!isValidXUrl(url)) {
    showError('That doesn\'t look like a valid X post link. Make sure it\'s in the format: https://x.com/user/status/...');
    return;
  }

  showStatus('Fetching video info…');

  try {
    const res = await fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Unable to fetch video. The post may be private or contain no video.');
    }

    if (!data.variants || data.variants.length === 0) {
      throw new Error('No downloadable video found in this post. Make sure the post actually contains a video.');
    }

    showQualityOptions(data.variants);
  } catch (err) {
    hideStatus();
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

function isValidXUrl(url) {
  try {
    const u = new URL(url);
    return (
      (u.hostname === 'x.com' || u.hostname === 'twitter.com' || u.hostname === 'www.x.com' || u.hostname === 'www.twitter.com') &&
      u.pathname.includes('/status/')
    );
  } catch {
    return false;
  }
}

function showStatus(msg) {
  const area = document.getElementById('statusArea');
  const text = document.getElementById('statusText');
  const spinner = document.getElementById('spinner');
  spinner.style.display = 'block';
  text.textContent = msg;
  area.style.display = 'flex';
  document.getElementById('qualityResults').style.display = 'none';
}

function hideStatus() {
  document.getElementById('statusArea').style.display = 'none';
}

function showQualityOptions(variants) {
  hideStatus();

  // Sort by bitrate descending (highest quality first)
  variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  const container = document.getElementById('qualityButtons');
  container.innerHTML = '';

  variants.forEach((v, i) => {
    const label = getQualityLabel(v, i === 0, variants.length);
    const btn = document.createElement('a');
    btn.className = 'quality-btn' + (i === 0 ? ' best' : '');
    btn.href = v.url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.setAttribute('download', '');

    if (i === 0) {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${label} <span class="badge">Best</span>
      `;
    } else {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        ${label}
      `;
    }

    container.appendChild(btn);
  });

  document.getElementById('qualityResults').style.display = 'block';
}

function getQualityLabel(variant, isBest, total) {
  if (variant.resolution) return variant.resolution;
  if (variant.bitrate) {
    const kbps = Math.round(variant.bitrate / 1000);
    if (kbps >= 2000) return 'HD (high quality)';
    if (kbps >= 800) return 'Medium quality';
    return 'Low quality';
  }
  if (isBest) return 'Highest quality';
  return `Option ${total}`;
}

function showError(msg) {
  clearError();
  const card = document.getElementById('downloaderCard');
  const err = document.createElement('div');
  err.className = 'error-msg';
  err.id = 'errorMsg';
  err.textContent = msg;
  card.appendChild(err);
}

function clearError() {
  const e = document.getElementById('errorMsg');
  if (e) e.remove();
}

function clearResults() {
  hideStatus();
  clearError();
  document.getElementById('qualityResults').style.display = 'none';
  document.getElementById('qualityButtons').innerHTML = '';
}

// Allow pressing Enter in the input field
document.getElementById('videoUrl').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') fetchVideo();
});

// ===== FAQ accordion =====
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('active'));

  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('active');
  }
}

// ===== Mobile nav =====
document.getElementById('navToggle').addEventListener('click', function() {
  document.getElementById('navMobile').classList.toggle('open');
});
