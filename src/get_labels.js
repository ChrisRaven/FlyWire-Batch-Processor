function get60Labels(ids) {
  let url = 'https://prod.flywire-daf.com/neurons/api/v1/cell_identification?filter_by=root_id&as_json=1&ignore_bad_ids=True&filter_string='
  url += ids.join(',')
  url += '&middle_auth_token='
  url += localStorage.getItem('auth_token')

  return fetch(url)
    .then(res => res.text())
    .then(data => json_parse()(data))
}


function getLabels(ids, callback) {
  let params = []
  const promises = []
  for(let i = 0; i < ids.length; i++) {
    params.push(ids[i])
    if ((i > 0 && !(i % 60)) || i === ids.length - 1) {
      promises.push(get60Labels(params))
      params = []
    }
  }

  Promise.all(promises).then(results => {
    const filteredResults = {
      id: [],
      tag: [],
      userName: [],
      userAffiliation: []
    }

    results.forEach(result => {
      if (Object.values(result.pt_root_id).length) {
        filteredResults.id.push(...Object.values(result.pt_root_id))
        filteredResults.tag.push(...Object.values(result.tag))
        filteredResults.userName.push(...Object.values(result.user_name))
        filteredResults.userAffiliation.push(...Object.values(result.user_aff))
      }
    })

    callback && callback(filteredResults)
  })
}
