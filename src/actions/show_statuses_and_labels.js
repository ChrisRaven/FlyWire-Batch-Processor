function showStatusesAndLabels(visible) {
  const ids = visible.map(segment => segment.firstChild.dataset.segId)

  displayDialogWindow(ids)

  let params = []
  for(let i = 0; i < ids.length; i++) {
    params.push(ids[i])
    if ((i > 0 && !(i % 60)) || i === ids.length - 1) {
      getLabels(params)
      params = []
    }
  }
}


function displayDialogWindow(ids) {
  Dock.dialog({
    width: 870,
    id: 'statuses-dialog',
    html: buildTable(ids),
    css: addStatusesCss(),
    afterCreateCallback: addStatusButtonsEvents,
    destroyAfterClosing: true,
    okCallback: () => {},
    okLabel: 'Close'
  }).show()
}


function addHeaderBar() {
  return /*html*/`
    <div id="statuses-header-bar">
      <label><input type="checkbox" id="statuses-select-all">Select all</label>
      <button id="statuses-copy-selected">Copy selected</button>
      <button id="statuses-remove-selected">Remove selected</button>
      <button id="statuses-remove-identified">Remove identified</button>
      <button id="statuses-remove-unidentified">Remove unidentified</button>
      <button id="statuses-remove-unfinished">Remove unfinished</button>
    </div>
    <hr />
  `
}


function buildTable(ids) {
  let html = addHeaderBar()

  html += '<table id="statuses-and-labels-table">'
  html += /*html*/`
    <tr>
      <th></th>
      <th>ID</th>
      <th>Statuses</th>
      <th>Labels</th>
      <th>Authors</th>
      <th>Affiliations</th>
    </tr>`

  ids.forEach(id => {
    html += /*html*/`<tr id="status-for-${id}" data-seg-id="${id}">
      <td class="statuses-checkbox"><input type="checkbox" /></td>
      <td class="statuses-id">${id}</td>
      <td class="statuses-status"></td>
      <td class="statuses-labels"></td>
      <td class="statuses-authors"></td>
      <td class="statuses-affiliation"></td>
    </tr>`
  })
  html += '</table>'

  return html
}


function addStatusButtonsEvents() {
  document.getElementById('statuses-select-all').addEventListener('click', e => {
    document.querySelectorAll('.statuses-checkbox input').forEach(checkbox => {
      checkbox.checked = e.target.checked
    })
  })

  document.getElementById('statuses-copy-selected').addEventListener('click', e => {
    const selected = []
    document.querySelectorAll('.statuses-checkbox input:checked').forEach(checkbox => {
      selected.push(checkbox.closest('tr').dataset.segId)
    })

    navigator.clipboard.writeText(selected.join(','))
  })
  
  document.getElementById('statuses-remove-selected').addEventListener('click', e => {
    const container = document.querySelector('.item-container')

    document.querySelectorAll('.statuses-checkbox input:checked').forEach(checkbox => {
      const row = checkbox.closest('tr')
      const id = row.dataset.segId
      row?.remove()
      container.querySelector(`.segment-button[data-seg-id="${id}"]`).click()
    })
  })
  
  document.getElementById('statuses-remove-identified').addEventListener('click', e => {
    const container = document.querySelector('.item-container')
    const table = document.getElementById('statuses-and-labels-table')

    table.querySelectorAll('.identified').forEach(checkbox => {
      const row = checkbox.closest('tr')
      const id = row.dataset.segId
      row?.remove()
      container.querySelector(`.segment-button[data-seg-id="${id}"]`).click()
    })
  })
  
  document.getElementById('statuses-remove-unidentified').addEventListener('click', e => {
    const container = document.querySelector('.item-container')
    const table = document.getElementById('statuses-and-labels-table')

    table.querySelectorAll('.statuses-status:not(.identified):not(.outdated)').forEach(statusCell => {
      const row = statusCell.closest('tr')
      const id = row.dataset.segId
      row?.remove()
      container.querySelector(`.segment-button[data-seg-id="${id}"]`).click()
    })
  })

  document.getElementById('statuses-remove-unfinished').addEventListener('click', e => {
    const container = document.querySelector('.item-container')
    const table = document.getElementById('statuses-and-labels-table')

    table.querySelectorAll('.incompleted').forEach(statusCell => {
      const row = statusCell.closest('tr')
      const id = row.dataset.segId
      row?.remove()
      container.querySelector(`.segment-button[data-seg-id="${id}"]`).click()
    })
  })
  
}


function getLabels(ids) {
  let url = 'https://prod.flywire-daf.com/neurons/api/v1/cell_identification?filter_by=root_id&as_json=1&ignore_bad_ids=True&filter_string='
  url += ids.join(',')
  url += '&middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url)
    .then(res => res.text())
    .then(data => fillLabels(json_parse()(data), ids))
}


function getCompletedStatuses(ids) {
  let url = 'https://prod.flywire-daf.com/neurons/api/v1/proofreading_status?filter_by=root_id&as_json=1&ignore_bad_ids=True&filter_string='
  url += ids.join(',')
  url += '&middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url)
    .then(res => res.text())
    .then(data => {
      data = json_parse()(data)
      const allCompleted = Object.values(data.pt_root_id).map(id => id.toString())
      const notCompleted = arraySubtraction(ids, allCompleted)
      const completedNotIdentified = arraySubtraction(ids, notCompleted)
      completedNotIdentified.forEach(id => {
        document.querySelector(`#status-for-${id} .statuses-status`)?.classList.add('completed')
    
      })

      fillIncompletedStatuses(notCompleted)
    })
}


function fillIncompletedStatuses(ids) {
  let url = 'https://prodv1.flywire-daf.com/segmentation/api/v1/table/fly_v31/is_latest_roots?middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ node_ids: ids.map(id => id.toString()) })
  })
    .then(res => res.json())
    .then(data => {
      data.is_latest.forEach((state, i) => {
        document.querySelector(`#status-for-${ids[i]} .statuses-status`)?.classList.add(state ? 'incompleted' : 'outdated')
      })
    })
}


// Source: ChatGPT
function arraySubtraction(array1, array2) {
  const result = [];

  for (let i = 0; i < array1.length; i++) {
    if (!array2.includes(array1[i])) {
      result.push(array1[i]);
    }
  }

  return result;
}


function fillLabels(data, ids) {
  const identifiedIds = []
  for (let [i, id] of Object.entries(data.pt_root_id)) {
    identifiedIds.push(id.toString()) // .toString() to compare two arrays with the same type

    const label = document.createElement('div')
    label.classList.add('statuses-label')
    label.textContent = data.tag[i]
    document.querySelector(`#status-for-${id} .statuses-labels`)?.appendChild(label)
    
    const name = document.createElement('div')
    name.classList.add('statuses-name')
    name.textContent = data.user_name[i]
    document.querySelector(`#status-for-${id} .statuses-authors`)?.appendChild(name)

    const aff = document.createElement('div')
    aff.classList.add('statuses-name')
    aff.textContent = data.user_aff[i]
    document.querySelector(`#status-for-${id} .statuses-affiliation`)?.appendChild(aff)

    document.querySelector(`#status-for-${id} .statuses-status`)?.classList.add('identified')
  }

  const diff = arraySubtraction(ids, identifiedIds)

  getCompletedStatuses(diff)
}


function addStatusesCss() {
  return /*css*/`
    #statuses-dialog .content {
      max-height: 90vh;
      overflow-y: auto;
      font-size: 12px;
    }

    label:has(#statuses-select-all) {
      margin-right: 20px;
      cursor: pointer;
      user-select: none;
    }

    #statuses-select-all {
      vertical-align: text-bottom;
      margin: 0 7px;
    }

    #statuses-dialog #statuses-header-bar button {
      width: 140px;
    }

    #statuses-dialog th {
      top: 20px;
      position: sticky;
      background-color: #222;
    }

    #statuses-dialog tr:nth-child(even) {
      background-color: #333;
    }

    #statuses-dialog td {
      pading-left: 5px;
      padding-right: 30px;
    }

    #statuses-dialog .statuses-checkbox {
      padding: 0 5px;
      vertical-align: middle;
    }

    .statuses-labels {
      color: lightgreen;
    }

    .statuses-status.identified {
      background-color: #2ecc71;
    }

    .statuses-status.completed {
      background-color: #b01fff;
    }

    .statuses-status.incompleted {
      background-color: #e2c96a;
    }

    .statuses-status.outdated {
      background-color: #111111;
    }
  `
}
