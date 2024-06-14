function dataRequestForConnectivity(id) {
  return JSON.stringify({
    output: '..post_submit_download__summary.children...post_submit_download__upstream.children...post_submit_download__downstream.children...post_submit_linkbuilder_buttons.children...summary_table.columns...summary_table.data...incoming_table.columns...incoming_table.data...outgoing_table.columns...outgoing_table.data...graph_div.children...message_text.value...message_text.rows...submit_loader.children..',
    outputs: [
      { id: 'post_submit_download__summary', property: 'children' },
      { id: 'post_submit_download__upstream', property: 'children' },
      { id: 'post_submit_download__downstream', property: 'children' },
      { id: 'post_submit_linkbuilder_buttons', property: 'children' },
      { id: 'summary_table', property: 'columns' },
      { id: 'summary_table', property: 'data' },
      { id: 'incoming_table', property: 'columns' },
      { id: 'incoming_table', property: 'data' },
      { id: 'outgoing_table', property: 'columns' },
      { id: 'outgoing_table', property: 'data' },
      { id: 'graph_div', property: 'children' },
      { id: 'message_text', property: 'value' },
      { id: 'message_text', property: 'rows' },
      { id: 'submit_loader', property: 'children' }
    ],
    inputs: [{ id: 'submit_button', property: 'n_clicks' }],
    changedPropIds: [],
    state: [
      {
        id: { id_inner: 'input_field', type: 'url_helper' },
        property: 'value',
        value: id
      },
      {
        id: { id_inner: 'cleft_thresh_field', type: 'url_helper' },
        property: 'value',
        value: '50'
      },
      {
        id: { id_inner: 'timestamp_field', type: 'url_helper' },
        property: 'value'
      },
      {
        id: { id_inner: 'filter_list_field', type: 'url_helper' },
        property: 'value'
      }
    ]
  })
}


function getConnectivity_headers() {
  const authToken = localStorage.getItem('auth_token')

  return {
    accept: 'application/json',
    'content-type': 'application/json',
    cookie: 'middle_auth_token=' + authToken
  }
}


function getConnectivity(id, onloadCallback, onreadystatechangeCallback, onerrorCallback, direction = 'up') {
  let retry = 5

  function getData() {
    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://prod.flywire-daf.com/dash/datastack/flywire_fafb_production/apps/fly_connectivity/_dash-update-component',
      headers: getConnectivity_headers(),
      data: dataRequestForConnectivity(id),

      onload: res => {
        if (!res) return console.error('Error retrieving data for ' + id)

        if (onloadCallback && typeof onloadCallback === 'function') {
          onloadCallback(res, id, direction)
        }
      },

      onreadystatechange: res => {
        if (onreadystatechangeCallback && typeof onreadystatechangeCallback === 'function') {
          onreadystatechangeCallback(res, id, direction)
        }
      },

      ontimeout: res => {
        if (onerrorCallback && typeof onerrorCallback === 'function') {
          if (retry--) {
            getData()
            console.log('retrying')
          }
          else {
            onerrorCallback(res, id, direction)
          }
        }
      },

      onerror: res => {
        if (onerrorCallback && typeof onerrorCallback === 'function') {
          if (retry--) {
            getData()
            console.log('retrying')
          }
          else {
            onerrorCallback(res, id, direction)
          }
        }
      }
    })
  }
  
  getData()
}
