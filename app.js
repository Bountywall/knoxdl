// KnoxDL — app.js

const PROXY_ENDPOINT = 'https://knoxdl.com/api/fetch';
const DOWNLOAD_ENDPOINT = 'https://knoxdl.com';


async function fetchVideo() {
  const input = document.getElementById('videoUrl');
  const url = input.value.trim();

  clearResults();

  if (!url) {
    showError('Please paste an X (Twitter) video link first.');
    return;
  }

  if (!isValidXUrl(url)) {
    showError("That doesn't look like a valid X post link. Make sure it's in the format: https://x.com/user/status/...");
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

  variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  const container = document.getElementById('qualityButtons');
  container.innerHTML = '';

  variants.forEach((v, i) => {
    const label = getQualityLabel(v, i === 0, variants.length);
    const btn = document.createElement('button');
    btn.className = 'quality-btn' + (i === 0 ? ' best' : '');
    btn.type = 'button';

    const svgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

    if (i === 0) {
      btn.innerHTML = `${svgIcon} ${label} <span class="badge">Best</span>`;
    } else {
      btn.innerHTML = `${svgIcon} ${label}`;
    }

    btn.addEventListener('click', () => triggerDownload(v.url, btn));
    container.appendChild(btn);
  });

  document.getElementById('qualityResults').style.display = 'block';
}

async function triggerDownload(videoUrl, btn) {
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .75s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    Preparing…
  `;

  try {
    const proxyUrl = `${DOWNLOAD_ENDPOINT}?download=1&url=${encodeURIComponent(videoUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('Download failed');

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename = videoUrl.match(/\/([^/?#]+\.mp4)/i)?.[1] || 'knoxdl-video.mp4';

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Saved!
    `;
    setTimeout(() => { btn.innerHTML = originalHTML; btn.disabled = false; }, 2500);

  } catch (err) {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    // fallback — open directly in new tab
    window.open(videoUrl, '_blank');
  }
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

document.getElementById('videoUrl').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') fetchVideo();
});

function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('active'));
  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('active');
  }
}

document.getElementById('navToggle').addEventListener('click', function() {
  document.getElementById('navMobile').classList.toggle('open');
});
