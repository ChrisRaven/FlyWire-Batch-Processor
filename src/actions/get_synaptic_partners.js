function getSynapticPartners(visible) {
  if (!visible || !visible.length) return console.warn('Batch Processor - no visible segments')

  const id = visible[0].firstElementChild.dataset.segId
  if (!id) return console.warn('Batch Processor - no visible segments')

  Dock.dialog({
    width: 1000,
    id: 'get-synaptic-partners-dialog',
    html: getSynapticPartners.html(id),
    css: getSynapticPartners.css(),
    destroyAfterClosing: true,
    okLabel: 'Close',
    okCallback: () => {}
  }).show()

  getConnectivity(id, getSynapticPartners.onload, null, null)

}

getSynapticPartners.onload = (res) => {
  let data = JSON.parse(res.responseText)
  if (!data) return console.warn('Batch Processor - no data')
  data = data.response

  const incoming = getIdsFromData(data.incoming_table.data, 'Upstream Partner ID')
  const outgoing = getIdsFromData(data.outgoing_table.data, 'Downstream Partner ID')

  getLabels(incoming, showPartners.bind(null, 'incoming'))
  getLabels(outgoing, showPartners.bind(null, 'outgoing'))
}


function getIdsFromData(data, rowLabel) {
  return data.map(row => row[rowLabel].split(']')[0].substr(1))
}


function showPartners(type, data) {
  if (!data || !data.id.length) return

  const target = document.getElementById(`${type}-synaptic-partners-table`)
  const fragment = document.createDocumentFragment()
  const rows = {}

  for (let i = 0; i < data.id.length; i++) {
    const id = data.id[i]
    const tag = data.tag[i]
    const lTag = tag.toLowerCase()

    if (rows[lTag]) {
      rows[lTag].count++
      continue
    }

    const existingRow = document.getElementById(`${type}-partners-row-for-${id}`)
    if (existingRow) {
      existingRow.querySelector('.synaptic-partners-tag').setAttribute('title', `${existingRow.getAttribute('data-seg-id')}, ${id}`)
      rows[lTag] = { row: existingRow, count: 1 }
      continue
    }

    const row = createRow(type, id, tag)
    rows[lTag] = { row, count: 1 }
    fragment.appendChild(row)
  }

  const sortedRows = Object.values(rows)
    .sort((a, b) => a.row.querySelector('.synaptic-partners-tag').textContent.localeCompare(b.row.querySelector('.synaptic-partners-tag').textContent))

  let html = ''
  for (let i = 0; i < sortedRows.length; i++) {
    const { row, count } = sortedRows[i]
    const tag = row.querySelector('.synaptic-partners-tag').textContent
    if (count > 1) {
      row.querySelector('.synaptic-partners-tag').innerHTML = `${tag} <span class="synaptic-partners-multiplier">(x${count})</span>`
    }
    fragment.appendChild(row)
  }

  target.innerHTML = ''
  target.appendChild(fragment)
}

function createRow(type, id, tag) {
  const tr = document.createElement('tr')
  tr.id = `${type}-partners-row-for-${id}`
  tr.dataset.segId = id

  const td = document.createElement('td')
  td.classList.add('synaptic-partners-tag')
  td.title = id
  td.textContent = tag

  tr.appendChild(td)
  return tr
}




getSynapticPartners.html = (id) => {
  return /*html*/`
    <div id="synaptic-partners-wrapper">
      <div class="synaptic-partners-table-wrapper">
        <table id="incoming-synaptic-partners-table"></table>
      </div>
      <div id="synaptic-partners-center-segment">${id}</div>
      <div class="synaptic-partners-table-wrapper">
        <table id="outgoing-synaptic-partners-table"></table>
      </div>
    </div>
  `
}


getSynapticPartners.css = () => {
  return /*css*/`
  #get-synaptic-partners-dialog .content {
    max-height: 80vh;
  }

  #synaptic-partners-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .synaptic-partners-table-wrapper {
    width: 45%;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  #incoming-synaptic-partners-table,
  #outgoing-synaptic-partners-table {
    width: 100%;
  }

  #incoming-synaptic-partners-table {
    border-right: 1px solid #aaa;
    text-align: right;
    color: #6cb4ff;
  }

  #outgoing-synaptic-partners-table {
    border-left: 1px solid #aaa;
    color: #fdbc44;
  }
  
  #synaptic-partners-center-segment {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    writing-mode: vertical-rl;
  }

  .synaptic-partners-tag {
    font-size: 12px;
    width: 400px;
    max-width: 400px;
    overflow: hidden;
  }

  .synaptic-partners-multiplier {
    color: #57a757;
    display: inline-block;
    padding-left: 10px;
  }
  `
}
