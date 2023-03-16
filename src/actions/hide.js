function hide(type) {
  type.forEach(segment => {
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]
    if (checkbox.checked) {
      checkbox.click()
    }
  })
}
