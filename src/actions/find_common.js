let findImmediatePartners = false
const MAX_IMMEDIATE_PARTNERS = 30
const findCommon = (type, immediate = false) => {
  if (immediate) {
    findImmediatePartners = true
  }

  let ids = type.map(segment => segment.getElementsByClassName('segment-button')[0].dataset.segId)
  findCommon.idsLength = Math.min(ids.length, findImmediatePartners ? MAX_IMMEDIATE_PARTNERS : MAX_NUMBER_OF_SOURCES)
  
  if (!ids || !findCommon.idsLength) return error('No segments selected')

  findCommon.numberOfSources = Math.min(ids.length, findImmediatePartners ? MAX_IMMEDIATE_PARTNERS : MAX_NUMBER_OF_SOURCES)
  ids = ids.slice(0, findImmediatePartners ? MAX_IMMEDIATE_PARTNERS : MAX_NUMBER_OF_SOURCES)

  Dock.dialog({
    id: 'kk-find-common-dialog',
    html: findCommon_getHtml(ids),
    css: findCommon_getCss(),
    okCallback: () => {},
    okLabel: 'Close',
    width: 810,
    afterCreateCallback: findCommon_addEventListeners,
    destroyAfterClosing: true
  }).show()

  ids.forEach(id => {
    getConnectivity(id, findCommon.onload, findCommon.onreadystatechange)
  })
}


findCommon.finishedCounter = 0
findCommon.results = new Map()


findCommon.onload = (res, id, direction) => {
  const statusColumn = document.querySelector(`#kk-find-common-row-${id} .kk-find-common-row-status`)

  try {
    res = JSON.parse(res.responseText).response
  }
  catch {
    statusColumn.textContent = 'Error'
    statusColumn.style.color = '#FF0000'
  }
  if (!res) return

  findCommon.results.set(id, {
    upstream: filterResults(res.incoming_table, 'Upstream Partner ID'),
    downstream: filterResults(res.outgoing_table, 'Downstream Partner ID')
  })

  statusColumn.textContent = 'Success'
  statusColumn.style.color = '#00FF00'
}


findCommon.onreadystatechange = (res, id, direction) => {
  if (res && res.readyState === 4) {
    findCommon.finishedCounter++
  }

  if (findCommon.finishedCounter === findCommon.idsLength) {
    document.getElementById('kk-find-common-results-wrapper-wrapper').style.display = 'block'
  // without setTimeout onreadystatechange is called before last setting of results in the onload
    setTimeout(() => {
      prepareWideFieldResults(MAX_NUMBER_OF_RESULTS, findCommon.results, findCommon.numberOfSources)
      findCommon.finishedCounter = 0
      findCommon.results = new Map()
    }, 0)
  }
}


function findCommon_getHtml(ids) {
  let html = /*html*/`
    <table id="kk-find-common-sources-table">
      ${ids.map((id, index) => `
        <tr id="kk-find-common-row-${id}">
          <td class="kk-find-common-row-id" style="color: ${FIND_COMMON_COLORS[index]};">${id}</td>
          <td class="kk-find-common-row-status" style="color: yellow;">Fetching data...</td>
        </tr>
      `).join('')}
    </table>
    ${DEV ? '<button id="kk-find-common-clear-stored">Clear stored</button>' : ''}
    <div id="kk-find-common-results-wrapper-wrapper">
      <hr />
      <div class="kk-find-common-results-wrapper">
        <div>Common upstream partners</div>
        <label><input type="checkbox" id="kk-find-common-upstream-select-all">Select all</label>
        <table id="kk-find-common-upstream-summary"></table>
      </div>
      <div class="kk-find-common-results-wrapper">
        <div>Common downstream partners</div>
        <label><input type="checkbox" id="kk-find-common-downstream-select-all">Select all</label>
        <table id="kk-find-common-downstream-summary"></table>
      </div>
      <hr />
      With selected:
      <button id="kk-find-common-get-all-upstream">Get all upstream partners</button>
      <button id="kk-find-common-get-all-downstream">Get all downstream partners</button>
      <button id="kk-find-common-get-all">Get all partners</button><br />

      <button id="kk-find-common-copy-results">Copy</button>
      <button id="kk-find-common-get-common-upstream">Get common upstream partners</button>
      <button id="kk-find-common-get-common-downstream">Get common downstream partners</button>
      <button id="kk-find-common-get-common">Get common partners</button>
    </div>
  `

  return html
}


function findCommon_getCss() {
  return /*css*/`
    #kk-find-common-sources-table {
      margin: auto;
      margin-bottom: 15px;
      font-size: 15px;
    }

    #kk-find-common-upstream-summary,
    #kk-find-common-downstream-summary {
      border-collapse: collapse;
      margin-top: 10px;
    }

    #kk-find-common-upstream-summary .result-color,
    #kk-find-common-downstream-summary .result-color {
      width: 17px;
    }

    #kk-find-common-upstream-summary .result-id,
    #kk-find-common-downstream-summary .result-id {
      padding-right: 10px;
    }

    .kk-find-common-row-id {
      padding: 0 20px;
    }

    #kk-find-common-results-wrapper-wrapper {
      display: none;
      text-align: center;
    }

    .kk-find-common-results-wrapper {
      display: inline-block;
      font-size: 14px;
      font-weight: 300;
      width: 45%;
    }

    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all-upstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-common-upstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all-downstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-common-downstream,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all,
    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-common {
      width: 220px;
    }

    #kk-find-common-results-wrapper-wrapper #kk-find-common-get-all-upstream {
      margin-left: 10px;
    }

    #kk-find-common-results-wrapper-wrapper #kk-find-common-copy-results {
      margin: 10px 40.5px 15px 0;
    }
  `
}



function findCommon_addEventListeners() {
  
  function addListener(id, type, source) {
    document.getElementById(id).addEventListener('click', getWideFieldResults.bind(null, type, source))
  }

  addListener('kk-find-common-get-all-upstream', 'all', 'upstream')
  addListener('kk-find-common-get-common-upstream', 'common', 'upstream')
  addListener('kk-find-common-get-all-downstream', 'all', 'downstream')
  addListener('kk-find-common-get-common-downstream', 'common', 'downstream')
  addListener('kk-find-common-get-all', 'all', 'both')
  addListener('kk-find-common-get-common', 'common', 'both')

  document.getElementById('kk-find-common-copy-results').addEventListener('click', copySelectedWideFieldResults)

  function selectAll(direction) {
    document.getElementById(`kk-find-common-${direction}stream-select-all`).addEventListener('click', e => {
      const checked = e.target.checked
      document.querySelectorAll(`#kk-find-common-${direction}stream-summary input[type="checkbox"]:not([disabled])`).forEach(el => {
        el.checked = checked
      })
    })
  }

  selectAll('up')
  selectAll('down')

  if (DEV) {
    document.getElementById('kk-find-common-clear-stored').addEventListener('click', e => {
      localStorage.removeItem('stored-ids-down-upstream')
      localStorage.removeItem('stored-ids-up-downstream')
      document.querySelectorAll('#kk-find-common-results-wrapper-wrapper .result-id input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = false
      })
    })
  }
}


function copySelectedWideFieldResults() {
  const ids = []

  document.querySelectorAll('.result-id input[type="checkbox"]:checked').forEach(el => {
    ids.push(el.parentElement.parentElement.dataset.id)
  })

  navigator.clipboard.writeText(ids.join('\r\n')).then(() => {
    Dock.dialog({
      id: 'kk-find-common-copy-results-direct',
      html: 'The IDs have been copied to clipboard',
      cancelCallback: () => {},
      cancelLabel: 'Close'
    }).show()
  })
}


const getWideFieldResults = (type, source) => {
  getWideFieldResults.type = type
  getWideFieldResults.source = source
  getWideFieldResults.numberOfFinishedRequests = 0
  getWideFieldResults.results = {
    upstream: {},
    downstream: {}
  }

  const resultIds = document.getElementsByClassName('result-id');
  for (let i = 0; i < resultIds.length; i++) {
    resultIds[i].style.color = 'white';
  }

  const ids = Array.from(document.querySelectorAll('.result-id input[type="checkbox"]:checked'))
    .map(el => {
      const grandParent = el.parentElement.parentElement;
      const id = grandParent.dataset.id;
      const direction = grandParent.classList.contains('up') ? 'up' : 'down';
      if (id) {
        getConnectivity(id, getWideFieldResults.onload, getWideFieldResults.onreadystatechange, getWideFieldResults.onerror, direction);
        document.getElementById(`result-id-${id}-${direction}`).style.color = 'yellow';
        return id;
      }
    })
    .filter(Boolean);

  if (!ids.length) {
    return;
  }
  getWideFieldResults.numberOfCells = ids.length
}


getWideFieldResults.onload = (res, id, direction) => {
  try {
    res = JSON.parse(res.responseText).response;
  } catch (error) {
    document.getElementById(`result-id-${id}-${direction}`).style.color = '#FF0000';
    return;
  }
  if (!res) {
    return;
  }

  getWideFieldResults.results.upstream[id] = filterResults(res.incoming_table, 'Upstream Partner ID');
  getWideFieldResults.results.downstream[id] = filterResults(res.outgoing_table, 'Downstream Partner ID');
}

getWideFieldResults.onreadystatechange = (res, id, direction) => {
  if (!res) {
    return;
  }

  const statusColumn = document.getElementById(`result-id-${id}-${direction}`);

  switch (res.readyState) {
    case 3:
      statusColumn.style.color = '#FFA500';
      break;
    case 4:
      getWideFieldResults.numberOfFinishedRequests++;
      statusColumn.style.color = '#00FF00';
      if (getWideFieldResults.numberOfFinishedRequests === getWideFieldResults.numberOfCells) {
        setTimeout(getPartnersOfPartners.bind(null, getWideFieldResults.results, getWideFieldResults.type, getWideFieldResults.source), 0);
      }
      break;
  }
}

getWideFieldResults.onerror = (res, id, direction) => {
  document.getElementById(`result-id-${id}-${direction}`).style.color = '$FF0000';
}




function prepareWideFieldResults(MAX_NUMBER_OF_RESULTS, results, numberOfSources) {
  let position = 0
  const upstream = {}
  const downstream = {}

  results.forEach((result) => {
    result.upstream.forEach((partnerId) => {
      upstream[partnerId] = upstream[partnerId] || new Array(numberOfSources).fill(false)
      upstream[partnerId][position] = true
    })

    result.downstream.forEach((partnerId) => {
      downstream[partnerId] = downstream[partnerId] || new Array(numberOfSources).fill(false)
      downstream[partnerId][position] = true
    })

    position++
  })

  if ((QUICK_FIND || findImmediatePartners) && results) {
    const ids = Array.from(results).flatMap((el) => [...el[1].downstream])
    ids.push(...Array.from(results).flatMap((el) => [...el[1].upstream]))
    Dock.dialog({
      id: 'kk-find-common-quick-find-dialog',
      html: `Found ${ids.length} IDs`,
      okCallback: () => {
        navigator.clipboard.writeText(ids.join('\r\n')).then(() => {
          Dock.dialog({
            id: 'kk-find-common-quick-find-copied-dialog',
            html: 'IDs copied to clipboard',
            okLabel: 'OK',
            okCallback: () => {},
            destroyAfterClosing: true
          }).show()
        })
      },
      okLabel: 'Copy',
      cancelCallback: () => {},
      cancelLabel: 'Cancel',
      destroyAfterClosing: true
    }).show()
  }
  else {
    const countOccurences = (data) => {
      return Object.entries(data).map(([id, state]) => {
        const sum = state.reduce((sum, value) => sum + value, 0)
        return { id, sum }
      }).sort((a, b) => b.sum - a.sum)
    }

    const numberOfOccurencesUpstream = countOccurences(upstream)
    const numberOfOccurencesDownstream = countOccurences(downstream)

    const tableUpstream = document.getElementById('kk-find-common-upstream-summary')
    const tableDownstream = document.getElementById('kk-find-common-downstream-summary')
    tableUpstream.innerHTML = generateWideFieldResultsHtml(numberOfOccurencesUpstream, upstream, 'up')
    tableDownstream.innerHTML = generateWideFieldResultsHtml(numberOfOccurencesDownstream, downstream, 'down')
  }
}



function generateWideFieldResultsHtml(occurences, sources, streamDirection) {
  let html = '';

  // the switched directions isn't an error - it's source vs destination
  const storedDirection = streamDirection === 'up' ? 'up-downstream' : 'down-upstream'
  let storedIds = localStorage.getItem('stored-ids-' + storedDirection)
  if (storedIds) {
    storedIds = storedIds.split(',')
  }

  for (let i = 0; i < MAX_NUMBER_OF_RESULTS; i++) {
    const id = occurences[i].id;
    let sourcesHtml = '';

    sources[id].forEach((source, index) => {
      const bgColor = source ? FIND_COMMON_COLORS[index] : 'transparent';
      sourcesHtml += `<td class="result-color" style="background-color: ${bgColor}"></td>`;
    });


    let disabled = ''
    if (storedIds && storedIds.length) {
      disabled = storedIds.includes(id) ? 'disabled' : ''
    }

    const resultId = `result-id-${id}-${streamDirection}`;
    html += `
      <tr>
        <td id="${resultId}" class="result-id ${streamDirection}" data-id="${id}">
          <label><input type="checkbox" ${disabled}>${id}</label>
        </td>
        ${sourcesHtml}
      </tr>`;
  }

  return html;
}


function filterResults(table, rowName) {
  const ids = []

  table.data.forEach(row => {
    const text = row[rowName]
    if (!text) return

    const id = text.substring(1, text.indexOf(']'))
    ids.push(id)
  })

  return ids
}



function getPartnersOfPartners(results, type, source) {
  let partnersResults = [];
  let tableToAnalyze = [];
  let numberOfTables = 0;

  const ids = []

  if (source === 'upstream' || source === 'both') {
    Object.values(results.upstream).forEach(partners => {
      tableToAnalyze.push(...partners);
      numberOfTables++;
    });

    for (const [key, value] of Object.entries(results.upstream)) {
      if (value.length) {
        ids.push(key)
      }
    }
  }
  
  if (source === 'downstream' || source === 'both') {
    Object.values(results.downstream).forEach(partners => {
      tableToAnalyze.push(...partners);
      // for "both" we would count the same "big" common synaptic parnter twice
      if (source !== 'both') {
        numberOfTables++;
      }
    });

    for (const [key, value] of Object.entries(results.downstream)) {
      if (value.length) {
        ids.push(key)
      }
    }
  }

  if (type === 'common') {
    const counters = {};
    tableToAnalyze.forEach(partner => {
      counters[partner] = (counters[partner] || 0) + 1;
    });

    Object.entries(counters).forEach(([id, count]) => {
      if (count === numberOfTables) {
        partnersResults.push(id);
      }
    });
  }
  else {
    partnersResults = [...new Set(tableToAnalyze)];
  }

  partnersResults.sort();

  const dialogContent = `Found ${partnersResults.length} result(s)<br />Click the "Copy" button to copy the results to clipboard`;
  const okCallback = () => {
    if (DEV) {
      markChecked_DEV(source, ids)
    }

    navigator.clipboard.writeText(partnersResults.join('\r\n')).then(() => {
      Dock.dialog({
        id: 'kk-copy-common-copied-confirm',
        html: 'IDs have been copied to clipboard',
        cancelCallback: () => {},
        cancelLabel: 'Close'
      }).show();
    });
  };

  Dock.dialog({
    id: 'kk-find-common-ids-copied-msg',
    html: dialogContent,
    okCallback,
    okLabel: 'Copy',
    cancelCallback: () => {},
    cancelLabel: 'Close'
  }).show();
}


function markChecked_DEV(source, ids) {
  // downstream of upstream
  if (source === 'downstream' || source === 'both') {
    let storedIds = localStorage.getItem('stored-ids-up-downstream')
    if (storedIds) {
      storedIds = storedIds.split(',')
      storedIds.push(...ids)
    }
    else {
      storedIds = ids
    }
    localStorage.setItem('stored-ids-up-downstream', storedIds)

    document.querySelectorAll('#kk-find-common-upstream-summary input[type="checkbox"]').forEach(checkbox => {
      const id = checkbox.closest('td').dataset.id
      if (storedIds.includes(id)) {
        checkbox.checked = false
        checkbox.disabled = true
      }
    })
  }

  // upstream of downstream
  if (source === 'upstream' || source === 'both') {
    let storedIds = localStorage.getItem('stored-ids-down-upstream')
    if (storedIds) {
      storedIds = storedIds.split(',')
      storedIds.push(...ids)
    }
    else {
      storedIds = ids
    }
    localStorage.setItem('stored-ids-down-upstream', storedIds)

    document.querySelectorAll('#kk-find-common-downstream-summary input[type="checkbox"]').forEach(checkbox => {
      const id = checkbox.closest('td').dataset.id
      if (storedIds.includes(id)) {
        checkbox.checked = false
        checkbox.disabled = true
      }
    })
  }
}

