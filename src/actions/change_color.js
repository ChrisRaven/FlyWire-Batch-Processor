function changeColor(type) {
  const colorSelectors = type.map(segment => segment.getElementsByClassName('segment-color-selector')[0])
  const previousColors = colorSelectors.map(selector => selector.value)
  let pickr

  Dock.dialog({
    id: 'kk-change-color-dialog',
    html: '<input id="kk-change-color-selector" />',
    okCallback: okCallback,
    okLabel: 'Change',
    cancelCallback: () => {},
    cancelLabel: 'Cancel',
    afterCreateCallback: afterCreateCallback,
    width: 228,
    destroyAfterClosing: true
  }).show()

  function okCallback() {
    const newColorArray = pickr.getColor().toRGBA()
    let newColor = '#'
    
    for (let i = 0; i <= 2; i++) {
      let colorComponent = Math.round(newColorArray[i]).toString(16)
      if (colorComponent.length < 2) {
        colorComponent = '0' + colorComponent
      }
      newColor += colorComponent
    }

    colorSelectors.forEach(selector => {
      selector.value = newColor
      const event = new Event('change')
      selector.dispatchEvent(event)
    })

    viewer.layerManager.layersChanged.dispatch()
  }

  function afterCreateCallback() {
    pickr = Pickr.create({
      el: '#kk-change-color-selector',
      theme: 'nano',
      showAlways: true,
      inline: true,
      default: previousColors[0],
      defaultRepresentation: 'HEX',
      position: 'top-middle',
      components: {
        palette: false,
        preview: true,
        hue: true,
        interaction: {
          input: true
        }
      }
    })
    document.getElementsByClassName('pickr')[0].style.display = 'none'
  }
}
