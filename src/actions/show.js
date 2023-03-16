function show(type, allSegments) {
  hideAll(allSegments)
  type.forEach(segment => {
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]
    if (!checkbox.checked) {
      checkbox.click()
    }
  })
}


function hideAll(segments) {
  segments.forEach(segment => {
    const checkbox = segment.getElementsByClassName('segment-checkbox')[0]
    if (checkbox.checked) {
      checkbox.click()
    }
  })
}
