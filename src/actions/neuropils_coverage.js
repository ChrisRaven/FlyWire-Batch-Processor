const showNeuropilsCoverage = (segments) => {
  Dock.dialog({
    width: 720,
    id: 'show-neuropils-coverage',
    html: showNeuropilsCoverage.generateHtml(segments),
    css: showNeuropilsCoverage.getCss(),
    destroyAfterClosing: true,
    afterCreateCallback: () => {
      getConnectivities(segments)
      addButtonsEvents(segments)
    }
  }).show()
}

function getConnectivities(segments) {
  segments.forEach(segment => {
    const id = segment.firstElementChild.dataset.segId
    getConnectivityForARow(id)
  })
}

function getConnectivityForARow(id) {
  getConnectivity(id, onload, onreadystatechange)

  const idCell = document.getElementById(`neuropils-for-${id}`)
  if (idCell) {
    idCell.style.color  = 'yellow'
  }

  function onload(res) {
    try {
      res = JSON.parse(res.responseText).response;
      addNeuropilsBars(id, res.graph_div.children[2].props.children.props.figure.data[0], true)
      addNeuropilsBars(id, res.graph_div.children[3].props.children.props.figure.data[0], false)
      addNeurotransmitters(id, res.incoming_table.data, true)
      addNeurotransmitters(id, res.outgoing_table.data, false)
      document.querySelector(`#neuropils-for-${id} button`)?.classList.add('retry-button-hidden')
    }
    catch {
      document.querySelector(`#neuropils-for-${id} button`)?.classList.remove('retry-button-hidden')
      if (idCell) {
        idCell.style.color = '#FF0000'
      }
    }
  }

  function onreadystatechange(res, id) {
    const idCell = document.getElementById(`neuropils-for-${id}`)

    // cell might've been removed before finishing the task
    if (!idCell) return

    switch (res.readyState) {
      case 3:
        idCell.style.color = '#FFA500';
        break;
      case 4:
        idCell.style.color = '#00FF00';
        break;
    }
  }
}

function addButtonsEvents(segments) {
  document.getElementById('neuropils-coverage-table').addEventListener('click', e => {
    if (e.target.classList.contains('retry-button')) {
      const row = e.target.parentElement.parentElement
      getConnectivityForARow(row.dataset.segId)
      row.style.height = 0
      e.target.classList.add('retry-button-hidden')
    }
  })

  document.getElementById('neuropils-select-all')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id').forEach(checkbox => {
      if (!checkbox.parentElement.parentElement?.classList.contains('neuropils-hidden-row')) {
        checkbox.checked = e.target.checked
      }
    })
  })

  document.getElementById('neuropils-copy-selected')?.addEventListener('click', e => {
    const selected = []
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id:checked').forEach(checkbox => {
      selected.push(checkbox.parentElement?.parentElement?.dataset.segId)
    })

    navigator.clipboard.writeText(selected)
  })

  document.getElementById('neuropils-hide-selected')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id:checked').forEach(checkbox => {
      checkbox.checked = false
      const row = checkbox.parentElement.parentElement
      row?.classList.add('neuropils-hidden-row')

    })
  })

  document.getElementById('neuropils-hide-unselected')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-select-id:not(:checked)').forEach(checkbox => {
      const row = checkbox.parentElement.parentElement
      row?.classList.add('neuropils-hidden-row')
    })
  })

  document.getElementById('neuropils-show-all-hidden')?.addEventListener('click', e => {
    document.querySelectorAll('#show-neuropils-coverage .neuropils-row').forEach(row => {
      row?.classList.remove('neuropils-hidden-row')
    })
  })

  document.getElementById('neuropils-remove-selected')?.addEventListener('click', e => {
    document.querySelectorAll('.neuropils-select-id').forEach(el => {
      if (el.checked) {
        el.parentElement?.parentElement.remove()
      }
    })
  })

  // here and below .querySelectorAll() instead of .getElementsByTagName(), because the latter creates a live NodeList,
  // which shrinks while removing elements from it
  document.getElementById('neuropils-remove-visible')?.addEventListener('click', e => {
    document.querySelectorAll('.neuropils-row').forEach(el => {
      if (!el.classList.contains('neuropils-hidden-row')) {
        el.remove()
      }
    })
  })

  document.getElementById('neuropils-remove-hidden')?.addEventListener('click', e => {
    document.querySelectorAll('.neuropils-hidden-row').forEach(el => {
      el.remove()
    })
  })
}

showNeuropilsCoverage.generateHtml = (segments) => {
  let html = `
    <label><input type="checkbox" id="neuropils-select-all">Select All</label>
    <button id="neuropils-copy-selected">Copy selected</button>
    <button id="neuropils-hide-selected">Hide selected</button>
    <button id="neuropils-hide-unselected">Hide unselected</button>
    <button id="neuropils-show-all-hidden">Show all hidden</button>
    <div id="neuropils-second-row-of-buttons">
      <button id="neuropils-remove-selected">Remove selected</button>
      <button id="neuropils-remove-visible">Remove visible</button>
      <button id="neuropils-remove-hidden">Remove hidden</button>
    </div>
    <hr />
  `

  html += '<table id="neuropils-coverage-table">'
  html += '<tr id="neuropils-neurotransmitters-header"><th></th><th>ID</th><th>neuropils</th><th>neurotransmitters</th></tr>'
  segments.forEach(segment => {
    const id = segment.firstElementChild.dataset.segId
    html += `<tr id="neuropils-for-${id}" class="neuropils-row" data-seg-id="${id}">
      <td><input type="checkbox" class="neuropils-select-id"></td>
      <td>${id}</td>
      <td class="neuropils-bars-cell"><div class="neuropils-bars-wrapper"></div></td>
      <td class="neuropils-neurotransmitters"><div class="neurotransmitters-bars-wrapper"></div></td>
      <td><button class="retry-button retry-button-hidden">Retry</button></td>
    </tr>`
  })

  html += '</table>'

  return html
}


function addNeuropilsBars(id, result, firstRow) {
  const tableCell = document.querySelector(`#neuropils-for-${id} .neuropils-bars-wrapper`)
  // the class below to add the white background color only after the neuropils are ready to be displayed
  // otherwise there would be big bright empty bars shining at user
  tableCell.classList.add('neuropils-bars-cell-background')

  const { labels, values, marker: { colors } } = result;
  for (let i = 0; i < labels.length; i++) {
    const bar = document.createElement('div');
    bar.classList.add('neuropil-bar');
    bar.style.width = `${values[i] * 200}px`;
    bar.style.backgroundColor = `#${colors[i]}`;
    if (firstRow) {
      bar.classList.add('bar-separator')
    }
    bar.title = labels[i];
    tableCell.appendChild(bar);
  }
}


function addNeurotransmitters(id, result, firstRow) {
  let gaba = 0
  let ach  = 0
  let glut = 0
  let oct  = 0
  let ser  = 0
  let da   = 0
  let synapses = 0

  for (let i = 0; i < result.length; i++) {
    const res = result[i]
    const syn = parseInt(res['Synapses'], 10)

    gaba += parseFloat(res['Gaba Avg']) / syn
    ach  += parseFloat(res['Ach Avg'] ) / syn
    glut += parseFloat(res['Glut Avg']) / syn
    oct  += parseFloat(res['Oct Avg'] ) / syn
    ser  += parseFloat(res['Ser Avg'] ) / syn
    da   += parseFloat(res['Da Avg']  ) / syn

    synapses += syn
  }

  gaba /= synapses
  ach  /= synapses
  glut /= synapses
  oct  /= synapses
  ser  /= synapses
  da   /= synapses

  const coefficient = 1 / (gaba + ach + glut + oct + ser + da)

  gaba *= coefficient
  ach *= coefficient
  glut *= coefficient
  oct *= coefficient
  ser *= coefficient
  da *= coefficient

  const wrapper = document.createElement('div')
  wrapper.classList.add('neuropils-neurotransmitters-wrapper')
  if (firstRow) {
    document.querySelector(`#neuropils-for-${id} .neurotransmitters-bars-wrapper`).remove()
    wrapper.classList.add('bar-separator')
  }
  document.querySelector(`#neuropils-for-${id} .neuropils-neurotransmitters`).appendChild(wrapper)
  createNeurotransmitterBar(id, wrapper, 'Gaba', gaba)
  createNeurotransmitterBar(id, wrapper, 'Ach',  ach)
  createNeurotransmitterBar(id, wrapper, 'Glut', glut)
  createNeurotransmitterBar(id, wrapper, 'Oct',  oct)
  createNeurotransmitterBar(id, wrapper, 'Ser',  ser)
  createNeurotransmitterBar(id, wrapper, 'Da',   da)
}


function createNeurotransmitterBar(id, target, type, size) {
  const bar = document.createElement('div')
  bar.classList.add('neurotransmitter-circle')
  bar.classList.add('nt-' + type.toLowerCase())
  bar.style.height = '10px'
  bar.style.width = size * 200 + 'px'
  bar.title = type
  target?.appendChild(bar)
}


showNeuropilsCoverage.getCss = () => {
  return /*css*/`
    #show-neuropils-coverage .content {
      max-height: 95vh;
      overflow-y: auto;
    }

    #neuropils-neurotransmitters-header {
      position: sticky;
      top: 0px;
      background-color: #222;
    }

    #neuropils-coverage-table tr:hover {
      background-color: #333;
    }

    .neuropils-row {
      font-size: 14px;
    }

    .neuropils-hidden-row {
      visibility: collapse;
    }

    #show-neuropils-coverage .content button.retry-button {
      height: 20px;
      width: 70px;
    }
    .neuropils-neurotransmitters {
      width: 200px;
    }

    .neurotransmitters-bars-wrapper,
    .neuropils-bars-wrapper {
      margin-left: 10px;
      width: 200px;
      height: 18px;
      line-height: 0;
      border: 1px solid gray;
    }

    .neuropils-bars-cell-background {
      background-color: white;
    }

    .neuropil-bar {
      display: inline-block;
      height: 9px;
    }

    .retry-button-hidden {
      visibility: hidden;
    }

    #neuropils-select-all {
      vertical-align: text-top;
      margin-right: 8px;
      cursor: pointer;
    }

    label:has(#neuropils-select-all) {
      cursor: pointer;
      user-select: none;
    }

    #show-neuropils-coverage .content button {
      width: 120px;
    }

    .neuropils-neurotransmitters-wrapper {
      line-height: 0;
    }

    #neuropils-second-row-of-buttons {
      margin: 10px 0 0 94px;
    }

    .neurotransmitter-circle {
      display: inline-block;
      background-color: lightblue;
      vertical-align: middle;
    }

    .nt-gaba {
      background-color: rgb(99, 110, 250);
    }

    .nt-ach {
      background-color: rgb(239, 85, 59);
    }

    .nt-glut {
      background-color: rgb(0, 204, 150);
    }

    .nt-oct {
      background-color: rgb(171, 99, 250);
    }

    .nt-ser {
      background-color: rgb(255, 161, 90);
    }

    .nt-da {
      background-color: rgb(25, 211, 243);
    }

    .bar-separator {
      border-bottom: 1px solid white;
      width: 200px;
    }
  `
}