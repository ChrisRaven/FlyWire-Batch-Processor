

function addActionsMenu() {
  const id = 'kk-utilities-action-menu'
  if (document.getElementById(id)) return

  const menu = document.createElement('select')
  menu.id = id
  menu.style.margin = '5px 10px 0'

  const defaultOption = new Option('-- actions --', ' ')
  defaultOption.selected = true
  defaultOption.disabled = true
  defaultOption.hidden = true
  menu.add(defaultOption)

  const options = [
    ['optgroup', 'Change color for'],
    ['visible', 'change-color-visible'],

    ['optgroup', 'Find common partners for'],
    ['visible', 'find-common-partners-visible'],

    ['optgroup', 'Show neuropils coverage'],
    ['visible', 'show-neuropils-coverage'],

    ['optgroup', 'Show only'],
    ['identified', 'show-identified-only'],
    ['completed', 'show-completed-only'],
    ['incompleted', 'show-incompleted-only'],
    ['outdated', 'Show outdated-only'],

    ['optgroup', 'Hide'],
    ['identified', 'hide-identified'],
    ['completed', 'hide-completed'],
    ['incompleted', 'hide-incompleted'],
    ['outdated', 'hide-outdated'],

    ['optgroup', 'Open in new tab'],
    ['identified', 'open-identified-in-new-tab'],
    ['completed', 'open-completed-in-new-tab'],
    ['incompleted', 'open-incompleted-in-new-tab'],
    ['outdated', 'open-outdated-in-new-tab'],
    ['visible', 'open-visible-in-new-tab'],
    ['hidden', 'open-hidden-in-new-tab'],

    ['optgroup', 'Remove'],
    ['identified', 'remove-identified'],
    ['completed', 'remove-completed'],
    ['incompleted', 'remove-incompleted'],
    ['outdated', 'remove-outdated'],
    ['visible', 'remove-visible'],
    ['hidden', 'remove-hidden'],

    ['optgroup', 'Copy'],
    ['identified', 'copy-identified'],
    ['completed', 'copy-completed'],
    ['incompleted', 'copy-incompleted'],
    ['outdated', 'copy-outdated'],
    ['visible', 'copy-visible'],
    ['hidden', 'copy-hidden']
  ]

  let optgroup
  options.forEach(option => {
    if (option[0] === 'optgroup') {
      optgroup = document.createElement('optgroup')
      optgroup.label = option[1]
      menu.add(optgroup)
    }
    else {
      optgroup.appendChild(new Option(option[0], option[1]))
    }
  })

  const topBar = document.getElementsByClassName('neuroglancer-viewer-top-row')[0]
  const undoButton = document.getElementById('neuroglancer-undo-button')
  topBar.insertBefore(menu, undoButton)

  addActionsEvents()
}


function addActionsEvents() {
  const menu = document.getElementById('kk-utilities-action-menu')
  if (!menu) return

  menu.addEventListener('change', e => {
    actionsHandler(e)
    menu.selectedIndex = 0
  })
}


function actionsHandler(e) {
  const segments = document.getElementsByClassName('segment-div')
  /*
    .lightbulb.complete - completed and identified
    .lightbulb.unlabeled - completed, but not identified
    .lightbulb - normal
    .lightbulb.error.outdated - outdated
    .lightbulb.error - unknown
  */
  
  const identified = []
  const completed = []
  const normal = []
  const outdated = []
  const unknown = []
  const visible = []
  const hidden = []

  segments.forEach(segment => {
    const lightbulb = segment.getElementsByClassName('nge-segment-changelog-button')[0]
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]

    if (!lightbulb) return

    if (lightbulb.classList.contains('unlabeled')) {
      completed.push(segment)
    }
    else if (lightbulb.classList.contains('complete')) {
      identified.push(segment)
    }
    else if (lightbulb.classList.contains('outdated')) {
      outdated.push(segment)
    }
    else if (lightbulb.classList.contains('error')) {
      unknown.push(segment)
    }
    else {
      normal.push(segment)
    }

    if (checkbox.checked) {
      visible.push(segment)
    }
    else {
      hidden.push(segment)
    }
  })


  switch (e.target.value) {
    case 'change-color-visible':
      changeColor(visible)
      break

    case 'find-common-partners-visible':
      findCommon(QUICK_FIND ? hidden : visible)
      break

    case 'show-neuropils-coverage':
      showNeuropilsCoverage(visible)
      break

    case 'show-identified-only':
      show(identified, segments)
      break
    case 'show-completed-only':
      show(completed, segments)
      break
    case 'show-incompleted-only':
      show(normal, segments)
      break
    case 'Show outdated-only':
      show(outdated, segments)
      break

    case 'hide-identified':
      hide(identified)
      break
    case 'hide-completed':
      hide(completed)
      break
    case 'hide-incompleted':
      hide(normal)
      break
    case 'hide-outdated':
      hide(outdated)
      break

    case 'open-identified-in-new-tab':
      openInNewTab(identified)
      break
    case 'open-completed-in-new-tab':
      openInNewTab(completed)
      break
    case 'open-incompleted-in-new-tab':
      openInNewTab(normal)
      break
    case 'open-outdated-in-new-tab':
      openInNewTab(outdated)
      break
    case 'open-visible-in-new-tab':
      openInNewTab(visible)
      break
    case 'open-hidden-in-new-tab':
      openInNewTab(hidden)
      break

    case 'remove-identified':
      remove(identified)
      break
    case 'remove-completed':
      remove(completed)
      break
    case 'remove-incompleted':
      remove(normal)
      break
    case 'remove-outdated':
      remove(outdated)
      break
    case 'remove-visible':
      remove(visible)
      break
    case 'remove-hidden':
      remove(hidden)
      break
    
    case 'copy-identified':
      copy(identified)
      break
    case 'copy-completed':
      copy(completed)
      break
    case 'copy-incompleted':
      copy(normal)
      break
    case 'copy-outdated':
      copy(outdated)
      break
    case 'copy-visible':
      copy(visible)
      break
    case 'copy-hidden':
      copy(hidden)
      break
  }
}
