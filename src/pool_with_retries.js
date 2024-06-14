class RequestPool {
  constructor() {
    this.limit = 30;
    this.maxRetries = 20;
    this.timeout = 5 * 60 * 1000;
    this.queue = [];
    this.runningCount = 0;
    this.results = [];
    this.counter = 0;
    this.requestsCompleted = 0;
    this.requestsTotal = 0;
    this.resolveAll = null;
    this.callbackCalled = false
  }

  makeRequest(id) {
    return new Promise((resolve, reject) => {
      const requestTimeout = this.timeout || null;
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://prod.flywire-daf.com/dash/datastack/flywire_fafb_production/apps/fly_connectivity/_dash-update-component',
        headers: getConnectivity_headers(),
        data: dataRequestForConnectivity(id),
        timeout: this.timeout,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response);
          } else {
            reject(new Error(`Request failed with status ${response.status}`));
          }
        },
        onerror: (error) => {
          reject(error);
        },
        ontimeout: () => {
          reject(new Error(`Request timed out ${id}`));
        }
      });
    });
  }

  addRequest(id) {
    return new Promise((resolve, reject) => {
      const request = async (retries = 0) => {
        try {
          const response = await this.makeRequest(id);
          if (response.status === 200) {
            const responseBody = response.responseText;
            this.results.push(responseBody);
            this.counter++;
            this.requestsCompleted++;
            console.log(`${this.requestsCompleted}/${this.requestsTotal} finished [${id}]`);
            resolve(responseBody);
          } else {
            if (retries < this.maxRetries) {
              request(retries + 1);
            } else {
              this.counter++;
              this.requestsCompleted++;
              console.log(`${this.requestsCompleted}/${this.requestsTotal} finished [${id}]`);
              reject(new Error('Request failed'));
            }
          }
        } catch (error) {
          if (retries < this.maxRetries) {
            request(retries + 1);
          } else {
            this.counter++;
            this.requestsCompleted++;
            console.warn(`${this.requestsCompleted}/${this.requestsTotal} finished [${id}]`);
            reject(error);
          }
        } finally {
          this.runningCount--;
          this.processNextRequest();
        }
      };

      if (this.runningCount < this.limit) {
        this.runningCount++;
        request();
      } else {
        this.queue.push(request);
      }
    });
  }

  processNextRequest() {
    if (this.queue.length > 0 && this.runningCount < this.limit) {
      const request = this.queue.shift();
      this.runningCount++;
      request();
    }
  }

  runAllRequests(ids) {
    this.ids = ids;
    this.requestsTotal = ids.length;
    const promises = ids.map(id => this.addRequest(id));
    return Promise.allSettled(promises);
  }
}

