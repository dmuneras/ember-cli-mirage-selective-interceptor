import Server from 'ember-cli-mirage/server';

export function initialize() {
  /**
   * Creates a new Pretender instance.
   *
   * @method createPretender
   * @param {Server} server
   * @return {Object} A new Pretender instance.
   * @public
  */
  Server.prototype.createPretender = function(server) {
    return new Pretender(function() {
      this.passthroughRequest = function(verb, path, request) {
        if (server.shouldLog()) {
          console.log(`Passthrough request: ${verb.toUpperCase()} ${request.url}`);
        }
      };

      this.handledRequest = function(verb, path, request) {
        if (server.shouldLog()) {
          console.groupCollapsed(
            `Mirage: [${request.status}] ${verb.toUpperCase()} ${request.url}`
          );
          let { requestBody, responseText } = request;
          let loggedRequest, loggedResponse;

          try {
            loggedRequest = JSON.parse(requestBody);
          } catch(e) {
            loggedRequest = requestBody;
          }

          try {
            loggedResponse = JSON.parse(responseText);
          } catch(e) {
            loggedResponse = responseText;
          }

          console.log({
            request: loggedRequest,
            response: loggedResponse,
            raw: request
          });
          console.groupEnd();
        }
      };

      this.unhandledRequest = function(verb, path) {
        path = decodeURI(path);
        assert(
          `Your Ember app tried to ${verb} '${path}', but there was no route defined to handle this request. Define a route that matches this path in your mirage/config.js file. Did you forget to add your namespace?`
        );
      };

      this.createPassthrough = function(fakeXHR) {
        console.log(fakeXHR);
        // event types to handle on the xhr
        var evts = ['error', 'timeout', 'abort', 'readystatechange'];

        // event types to handle on the xhr.upload
        var uploadEvents = [];

        // properties to copy from the native xhr to fake xhr
        var lifecycleProps = ['readyState', 'responseText', 'responseXML', 'status', 'statusText'];

        var xhr = fakeXHR._passthroughRequest = new ctx.pretender._nativeXMLHttpRequest();
        xhr.open(fakeXHR.method, fakeXHR.url, fakeXHR.async, fakeXHR.username, fakeXHR.password);

        if (fakeXHR.responseType === 'arraybuffer') {
          lifecycleProps = ['readyState', 'response', 'status', 'statusText'];
          xhr.responseType = fakeXHR.responseType;
        }

        // use onload if the browser supports it
        if ('onload' in xhr) {
          evts.push('load');
        }

        // add progress event for async calls
        // avoid using progress events for sync calls, they will hang https://bugs.webkit.org/show_bug.cgi?id=40996.
        if (fakeXHR.async && fakeXHR.responseType !== 'arraybuffer') {
          evts.push('progress');
          uploadEvents.push('progress');
        }

        // update `propertyNames` properties from `fromXHR` to `toXHR`
        function copyLifecycleProperties(propertyNames, fromXHR, toXHR) {
          for (var i = 0; i < propertyNames.length; i++) {
            var prop = propertyNames[i];
            if (prop in fromXHR) {
              toXHR[prop] = fromXHR[prop];
            }
          }
        }

        // fire fake event on `eventable`
        function dispatchEvent(eventable, eventType, event) {
          eventable.dispatchEvent(event);
          if (eventable['on' + eventType]) {
            eventable['on' + eventType](event);
          }
        }

        // set the on- handler on the native xhr for the given eventType
        function createHandler(eventType) {
          xhr['on' + eventType] = function(event) {
            copyLifecycleProperties(lifecycleProps, xhr, fakeXHR);
            dispatchEvent(fakeXHR, eventType, event);
          };
        }

        // set the on- handler on the native xhr's `upload` property for
        // the given eventType
        function createUploadHandler(eventType) {
          if (xhr.upload) {
            xhr.upload['on' + eventType] = function(event) {
              dispatchEvent(fakeXHR.upload, eventType, event);
            };
          }
        }

        var i;
        for (i = 0; i < evts.length; i++) {
          createHandler(evts[i]);
        }
        for (i = 0; i < uploadEvents.length; i++) {
          createUploadHandler(uploadEvents[i]);
        }

        if (fakeXHR.async) {
          xhr.timeout = fakeXHR.timeout;
          xhr.withCredentials = fakeXHR.withCredentials;
        }
        for (var h in fakeXHR.requestHeaders) {
          xhr.setRequestHeader(h, fakeXHR.requestHeaders[h]);
        }
        return xhr;
      }
    }, { trackRequests: server.shouldTrackRequests() });
  }

  /**
   * Whitelist requests to the specified paths and allow them to pass through
   * your Mirage server to the actual network layer.
   *
   * @method passthrough
   * @param {String} [...paths] Any numer of paths to whitelist
   * @param {Array} options Unused
   * @public
  */

  Server.prototype.passthrough = function(transforms, ...paths) {
    let verbs = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
    let lastArg = paths[paths.length - 1];
    debugger;

    if (paths.length === 0) {
      paths = ['/**', '/'];
    } else if (Array.isArray(lastArg)) {
      verbs = paths.pop();
    }

    verbs.forEach((verb) => {
      paths.forEach((path) => {
        let fullPath = this._getFullPath(path);
        debugger;
        this.pretender[verb](fullPath, this.pretender.passthrough);
      });
    });
  }
}

export default {
  initialize,
  before: 'ember-cli-mirage'
};
