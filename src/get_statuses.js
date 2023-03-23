// requires "./get_labels.js"

function getStatuses(ids, callback) {
  let params = []
  const promises = []

  getStatuses.allIds = ids
  getStatuses.numberOfAllIds = ids.length
  getStatuses.numberOfProcessedIds = 0
  callback = callback.bind(null, getStatuses.results)

  for(let i = 0; i < ids.length; i++) {
    params.push(ids[i])
    if ((i > 0 && !(i % 60)) || i === ids.length - 1) {
      get60Statuses(params, callback, i)
      params = []
    }
  }
}

getStatuses.allIds
getStatuses.numberOfAllIds
getStatuses.numberOfProcessedIds


function get60Statuses(ids, callback, indexOfLastIdInBatch) {
  getLabels(ids, results => {
    results.id.forEach(id => {
      getStatuses.results[id] = 'identified'
    })
    getStatuses.numberOfProcessedIds += ids.length

    if (getStatuses.numberOfProcessedIds === getStatuses.numberOfAllIds) {
      getCompletedNotIdentified(callback)
    }
  })
}

getStatuses.results = {}


function getCompletedNotIdentified(callback) {
  const identifiedIds = Object.keys(getStatuses.results).map(id => id.toString())
  const notIdentified = Dock.arraySubtraction(getStatuses.allIds, identifiedIds)

  if (!notIdentified.length) return callback()

  let url = 'https://prod.flywire-daf.com/neurons/api/v1/proofreading_status?filter_by=root_id&as_json=1&ignore_bad_ids=True&filter_string='
  url += notIdentified.join('%2C')
  url += '&middle_auth_token='
  url += localStorage.getItem('auth_token')

  fetch(url)
    .then(res => res.text())
    .then(data => {
      // if no data, then jump directly to the next stage with all the IDs,
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

      callback()
    })
}
