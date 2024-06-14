function getPartnersOfCommon(startingIds, threshold = 4) {
  console.log('Getting partners of primary IDs...')
  const primaryPool = new RequestPool()
  primaryPool.runAllRequests(startingIds.split(',').map(id => id.trim())).then(primaryFinished)

  let finalResults

  function getMostCommon(ids) {
    // Step 1: Track frequency of IDs
    const frequency = {};
    console.log('counting...')
    ids.forEach((id) => {
      frequency[id] = (frequency[id] || 0) + 1;
    });
  
    // Step 2: Get IDs with frequency greater than ${threshold}
    const commonIDs = Object.keys(frequency).filter((id) => frequency[id] > threshold);
  
    // Step 3: Sort common IDs by frequency in descending order
    console.log('sorting...')
    const sortedIDs = commonIDs.sort((a, b) => frequency[b] - frequency[a]);
  
    // Step 4: Return sorted list of common IDs
    return sortedIDs.splice(0, 250);
  }
  

  let mostCommonDownstream // this one is outside the function, so it can be accessed by the upstreamFinished() function
  function primaryFinished(results) {
    const idListUpstream = [];
    const idListDownstream = [];
    const len = results.length
    console.log('Primary - number of results: ', len)

    results.forEach((data, i) => {
      if (data === null) return
      if (data.status === 'rejected') return
      if (!data.value) return
      
      data = JSON.parse(data.value)
      try {
        console.log(`Merged an array to the results: ${i + 1}/${len}`)
        idListUpstream.push(...getIdsFromData(data.response.incoming_table.data, 'Upstream Partner ID'));
        idListDownstream.push(...getIdsFromData(data.response.outgoing_table.data, 'Downstream Partner ID'));
      }
      catch (error) {
        console.warn('No partners')
      }
    });

    const mostCommonUpstream = getMostCommon(idListUpstream);
    mostCommonDownstream = getMostCommon(idListDownstream);

    console.log('Getting downstream partners of the primary\'s upstream ones...')
    const upstreamPool = new RequestPool()
    upstreamPool.runAllRequests(mostCommonUpstream).then(upstreamFinished)
  }


  function upstreamFinished(results) {
    const ids = []
    const len = results.length

    results.forEach((data, i) => {
      if (data === null) return
      if (data.status === 'rejected') return
      if (!data.value) return
      
      data = JSON.parse(data.value)
      try {
        console.log(`Merged an array to the upstream list: ${i + 1}/${len}`)
        ids.push(...getIdsFromData(data.response.outgoing_table.data, 'Downstream Partner ID'));
      }
      catch (error) {
        console.warn('No partners')
      }
    })

    finalResults = new Set(ids)
    console.log('downstream of upstream', Array.from(ids).join('\r\n'))
    
    console.log('Getting upstream partners of the primary\'s downstream ones...')
    const downstreamPool = new RequestPool()
    downstreamPool.runAllRequests(mostCommonDownstream).then(downstreamFinished)
  }

  function downstreamFinished(results) {
    const ids = []
    const len = results.length

    results.forEach((data, i) => {
      if (data === null) return
      if (data.status === 'rejected') return
      if (!data.value) return
      
      data = JSON.parse(data.value)
      try {
        console.log(`Merged an array to the downstream list: ${i + 1}/${len}`)
        ids.push(...getIdsFromData(data.response.incoming_table.data, 'Upstream Partner ID'));
      }
      catch (error) {
        console.warn('No partners')
      }
    })

    ids.forEach(id => {
      finalResults.add(id)
    })
    
    console.log('upstream of downstream', Array.from(ids).join('\r\n'))
    console.log('All: ', Dock.arraySubtraction(Array.from(finalResults), startingIds).join('\r\n'))
  }
}
