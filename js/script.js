document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const condition = document.getElementById('condition');
  if (condition) {
    const condText = ['party', 'district', 'relation', 'secret']
      .map(k => {
        if (!params.get(k)) return null;
        if (k === 'relation') return '統一教会との関わり報道あり';
        if (k === 'secret') return '裏金不記載報道あり';
        return `${k}: ${params.get(k)}`;
      })
      .filter(Boolean)
      .join(', ');
    condition.textContent = condText || '指定なし';
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return 'c' + Math.abs(hash);
  }

  async function loadCandidates() {
    try {
      const res = await fetch('list.csv');
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/);
      const headers = lines.shift().split(',');
      return lines.filter(Boolean).map(line => {
        const values = line.split(',');
        const raw = {};
        headers.forEach((h, idx) => {
          raw[h.trim()] = values[idx] ? values[idx].trim() : '';
        });
        const obj = {
          name: raw['氏名'] || raw['name'] || '',
          age: raw['年齢'] || raw['age'] || '',
          party: raw['所属政党'] || raw['party'] || '',
          recommendation: raw['推薦'] || '',
          district: raw['選挙区'] || raw['district'] || '',
          relation: raw['統一教会との関わり'] || '',
          reference: raw['出展'] || '',
          secretMoney: raw['裏金不記載額'] || '',
        };
        obj.id = simpleHash(obj.name + obj.party + obj.age);
        return obj;
      });
    } catch (e) {
      console.error('CSV読み込みエラー', e);
      return [];
    }
  }

  async function loadList(file) {
    try {
      const res = await fetch(file);
      const text = await res.text();
      return text.trim().split(/\r?\n/).filter(Boolean);
    } catch (e) {
      console.error('CSV読み込みエラー', e);
      return [];
    }
  }

  async function loadDistrictData() {
    if (loadDistrictData.cache) return loadDistrictData.cache;
    const lines = await loadList('districts.csv');
    const data = lines.map(l => l.split(',').map(s => s.trim()).filter(Boolean));
    loadDistrictData.cache = data;
    return data;
  }

  async function loadPartyList() {
    if (loadPartyList.cache) return loadPartyList.cache;
    const lines = await loadList('parties.csv');
    loadPartyList.cache = lines;
    return lines;
  }

  async function populatePartyList() {
    const select = document.getElementById('party-select');
    if (!select) return;
    const parties = await loadPartyList();
    parties.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    });
  }

  async function populateDistrictList() {
    const select = document.getElementById('district-select');
    if (!select) return;
    const data = await loadDistrictData();
    data.forEach(row => {
      const district = row[0];
      const opt = document.createElement('option');
      opt.value = district;
      opt.textContent = district;
      select.appendChild(opt);
    });
  }


  async function showCandidateList() {
    const list = document.getElementById('candidate-list');
    if (!list) return;

    const candidates = (await loadCandidates()).filter(c => {
      if (params.get('party') && c.party !== params.get('party')) return false;
      if (params.get('district') && c.district !== params.get('district')) return false;
      if (params.get('relation') === 'true' && !c.relation) return false;
      if (params.get('secret') === 'true' && !c.secretMoney) return false;
      return true;
    });
    candidates.forEach(c => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <h3>${c.name}</h3>
        <p>政党: ${c.party}</p>
        ${c.recommendation ? `<p>推薦: ${c.recommendation}</p>` : ''}
        <p>選挙区: ${c.district}</p>
        <p>年齢: ${c.age}</p>
        ${c.relation ? `<p class="relation has-relation">統一教会との関わり報道: あり</p>` : ''}
        ${c.secretMoney ? `<p class="secret-money has-secret">裏金不記載額: ${c.secretMoney}</p>` : ''}
        <p><a href="candidate_detail.html?id=${c.id}">詳細</a></p>
      `;
      list.appendChild(div);
    });
  }

  async function showCandidateDetail() {
    const detail = document.getElementById('candidate-detail');
    if (!detail) return;
    const id = params.get('id');
    const candidate = (await loadCandidates()).find(c => c.id === id);

    if (candidate) {
      detail.innerHTML = `
        <h2>${candidate.name}</h2>
        <p>政党: ${candidate.party}</p>
        ${candidate.recommendation ? `<p>推薦: ${candidate.recommendation}</p>` : ''}
        <p>選挙区: ${candidate.district}</p>
        <p>年齢: ${candidate.age}</p>
        ${candidate.relation ? `<p>統一教会との関わり: ${candidate.relation}</p>` : ''}
        ${candidate.secretMoney ? `<p class="secret-money has-secret">裏金不記載額: ${candidate.secretMoney}</p>` : ''}
        ${candidate.reference ? `<p>出展: ${candidate.reference}</p>` : ''}
      `;
    } else {
      detail.textContent = '候補者情報が見つかりません。';
    }
  }

  populatePartyList();
  populateDistrictList();
  showCandidateList();
  showCandidateDetail();
});
