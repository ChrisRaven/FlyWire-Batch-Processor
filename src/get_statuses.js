// requires "./get_labels.js"

function getStatuses(ids, callback) {
  getLabels(ids, results => {
    results.id.forEach(id => {
      getStatuses.results[id] = 'identified'
    })
    getCompletedNotIdentified(callback, ids, results)
  })
}

getStatuses.results = {}


function getCompletedNotIdentified(callback, allIds, identifiedSegments) {
  const identifiedAsStrings = identifiedSegments.id.map(id => id.toString())
  const notIdentified = Dock.arraySubtraction(allIds, identifiedAsStrings)

  let url = 'https://prod.flywire-daf.com/neurons/api/v1/proofreading_status?filter_by=root_id&as_json=1&ignore_bad_ids=True&filter_string='
  url += notIdentified.join(',')
  url += '&middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url)
    .then(res => res.text())
    .then(data => {
      // jump directly to the next stage with all the IDs,
      // that left after checking identified cells
      if (!data) return getIncompleted(notIdentified, callback)

      data = json_parse()(data)
      // as above
      if (!data) return getIncompleted(notIdentified, callback)

      const completedNotIdentifed = Object.values(data.pt_root_id).map(id => id.toString())
      completedNotIdentifed.forEach(id => {
        getStatuses.results[id] = 'completed'
      })

      const notCompletedNotIdentified = Dock.arraySubtraction(notIdentified, completedNotIdentifed)
      getIncompleted(notCompletedNotIdentified, callback)
    })
}


function getIncompleted(ids, callback) {
  let url = 'https://prodv1.flywire-daf.com/segmentation/api/v1/table/fly_v31/is_latest_roots?middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ node_ids: ids.map(id => id.toString()) })
  })
    .then(res => res.json())
    .then(data => {
      data.is_latest.forEach((state, i) => {
        getStatuses.results[ids[i]] = state ? 'incompleted' : 'outdated'
      })

      callback(getStatuses.results)
    })
}
