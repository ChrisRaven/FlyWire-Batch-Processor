function copy(type) {
  const ids = type.map(segment => segment.getElementsByClassName('segment-button')[0].dataset.segId)

  navigator.clipboard.writeText(ids.join())
}
