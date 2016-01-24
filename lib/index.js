var VERSION = '0.0.1';

var qs = require('querystring');
var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');

var j = request.jar();

var request = request.defaults({
    followAllRedirects: true,
    jar: j,
    headers: {
        'Content-type': 'application/x-www-form-urlencoded'
    }
});

var express = require('express'),
    app = express();

var url = '';

/*app.get('/OAuthRedirect.aspx', function (req, res) {
  res.writeHead(200);
  res.end('.');
});*/
app.listen(3000);

function Box(options) {
    var self = this;

    var defaults = {
        authorize_url: 'https://app.box.com/api/oauth2/authorize',
        token_url: 'https://app.box.com/api/oauth2/token',
        user_name: null,
        password: null,
        client_id: null,
        client_secret: null,
        view_api_key: null,
        base_url: 'https://api.box.com/2.0',
        upload_url: 'https://upload.box.com/api/2.0',
        view_url: 'https://view-api.box.com/1',
        auto_rename: true,
        token: null,
        images: {
            'application/octet-stream': {
                'path': require('path').join(__dirname, "/images/default.png"),
                'link_type': 'file'
            }
            /*
            'image/png' : {
              'path' : 'http://somewhere.com/png_thumbnail.png',
              'link_type' : 'url' 
            }
            */
        },
        use_box_generic_thumbnails: true
    };

    /* Set options merging passed in options with defaults */
    self.options = merge_options(defaults, options);

    /* Initialize object */
    function initialize() {
        if (!self.options.user_name || !self.options.password || !self.options.client_id || !self.options.client_secret || !self.options.authorize_url || !self.options.token_url || !self.options.base_url || !self.options.upload_url) {

            console.log(self.options);

            //throw new Error('Invalid options.  Required: {authorize_url : <url>, token_url : <url>, user_name : <user_id>, password : <password>, client_id : <client_id>, client_secret : <client_secret>, base_url: <url>, upload_url: <url>}');
        }
    }

    /* Update the expires date */
    function update_expires(time) {
        var accessTokenExpireDate = new Date();
        accessTokenExpireDate.setMinutes(accessTokenExpireDate.getMinutes() + Math.floor(time / 60));
        self.options.token["expire_date"] = accessTokenExpireDate;

        var refreshTokenExpireDate = new Date(accessTokenExpireDate.getTime() + 59 * 24 * 60 * 60 * 1000);
        self.options.token["refresh_expire_date"] = refreshTokenExpireDate;
    }

    /* Validates access token */
    function validateToken(callback) {
        if (self.options.token == null || (self.options.token.expire_date < new Date() && self.options.token.refresh_expire_date < new Date())) {
            /* Need new token, or token and refresh token have expired */
            self.gettoken(function(data) {
                callback();
            });
        } else {
            if (self.options.token.expire_date < new Date() && self.options.token.refresh_expire_date > new Date()) {
                /* Token has expired, need to refresh */
                self.refreshtoken(function(data) {
                    callback();
                });
            } else {
                /* everything is set */
                callback();
            }
        }
    }

    /* Public function to get access token */
    this.gettoken = function(callback) {
        getToken(self.options, function(data) {
            self.options.token = data;

            update_expires(self.options.token.expires_in);

            callback(data);
        });
    }

    /* Public function to refresh access token */
    this.refreshtoken = function(callback) {
        refreshToken(self.options, function(data) {
            self.options.token = data;

            update_expires(self.options.token.expires_in);

            callback(data);
        });
    }

    /* Public function to upload a file */
    this.uploadfile = function(values, callback) {
        if (self.options.token == null || (self.options.token['expire-date'] < new Date() && self.options.token['refresh-expire-date'] < new Date())) {
            /* Need new token, or toekn and refresh token have expired */
            self.gettoken(function(data) {
                uploadFile(values, self.options, function(data) {
                    callback(data);
                });
            });
        } else {
            if (self.options.token['expire-date'] < new Date() && self.options.token['refresh-expire-date'] > new Date()) {
                /* Token has expired, need to refresh */

                self.refreshtoken(function(data) {
                    uploadFile(values, self.options, function(data) {
                        callback(data);
                    });
                });

            } else {
                /* everything is set */
                uploadFile(values, self.options, function(data) {
                    callback(data);
                });
            }
        }
    }

    /* Public function to get file information */
    this.getfileinfo = function(values, callback) {
        validateToken(function() {
            getFileInformation(values, self.options, function(data) {
                callback(data);
            });
        });
    };

    /* Public function to create a shared link for a box file */
    this.createsharedlink = function(values, callback) {
        validateToken(function() {
            createSharedLink(values, self.options, function(data) {
                callback(data);
            });
        });
    }

    /* Public finction to retrieve an uploaded file */
    this.getfile = function(values) {
        validateToken(function() {
            getFile(values, self.options);
        });
    }

    /* Public function to retrieve a thumbnail of an uploaded file */
    this.getthumbnail = function(values) {
        validateToken(function() {
            getThumbnail(values, self.options);
        });
    }

    initialize();
}

Box.VERSION = VERSION;
module.exports = Box;

/* Box specific functions */

/* Get new token */
function getToken(options, callback) {
    //we need to login and get acces token

    var authorize_url_complete = options.authorize_url + '?response_type=code&client_id=' + options.client_id + '&state=authenticated';

    request.get(authorize_url_complete, function(e, r, body) {
        if (e) {
            throw new Error(e)
        };
        jsdom.env(
            body, ['//ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js'],
            function(errors, window) {
                var $ = window.$;

                $('input#login').val(options.user_name);
                $('input#password').val(options.password);

                authorize_url_complete = $('form[name="login_form"]').attr('action');

                var req = request.post(authorize_url_complete, function(e, r, body) {
                    if (e) {
                        throw new Error(e)
                    };
                    jsdom.env(
                        body, ['//ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js'], {
                            features: {
                                ProcessExternalResources: ["script"]
                            }
                        },
                        function(errors, window) {
                            var $ = window.$;

                            authorize_url_complete = $('form[name="consent_form"]').attr('action');

                            var req = request.post(authorize_url_complete, function(e, r, body) {
                                if (e) {
                                    throw new Error(e)
                                };
                                var queryStr = require('url').parse(r.req.path);
                                var items = qs.parse(queryStr.query);
                                var code = items["code"];

                                var req = request.post(options.token_url, function(e, r, body) {
                                    if (e) {
                                        throw new Error(e)
                                    };

                                    callback(JSON.parse(body));
                                });

                                var form = req.form();
                                form.append('grant_type', 'authorization_code');
                                form.append('code', code);
                                form.append('client_id', options.client_id);
                                form.append('client_secret', options.client_secret);
                            });

                            var form = req.form();
                            $('input').each(function(index) {
                                var key = $(this).attr('name');
                                var value = $(this).val();

                                if (typeof key != 'undefined') {
                                    if ($(this).attr('type') != 'submit') {
                                        form.append(key, value);
                                    }
                                }
                            });

                            var accept_button = $('form#consent_form').find('button[name*="accept"]');
                            form.append($(accept_button).attr('name'), $(accept_button).attr('value'));
                        }
                    );
                });

                var form = req.form();
                $('form[name="login_form"]').find('input').each(function(index) {
                    var key = $(this).attr('name');
                    var value = $(this).val();

                    form.append(key, value);
                });
            }
        );


    });
}

/* Use refresh token to get new token */
function refreshToken(options, callback) {
    token = options.token;

    var req = request.post(options.token_url, function(e, r, body) {
        callback(JSON.parse(body));
    });

    var form = req.form();

    form.append('grant_type', 'refresh_token');
    form.append('refresh_token', token.refresh_token);
    form.append('client_id', options.client_id);
    form.append('client_secret', options.client_secret);
}

/* Upload a file */
function uploadFile(values, options, callback) {
    getFileByNameAndFolder(values.filename, values.folderid, options, function(data) {
        var url = options.upload_url + "/files/content";
        var header = {
            url: url,
            headers: {
                'Authorization': 'Bearer ' + options.token.access_token
            },
            method: "POST"
        };

        var formdata = {
            attributes: {
                "name": values.filename,
                "parent": {
                    "id": values.folderid
                }
            }
        };

        if (data != null) {
            /* file does exist, rename file */
            var timestamp = (new Date()).getTime();

            var ext = require('path').extname(values.filename);
            var fileBasename = require('path').basename(values.filename, ext);

            var fileName = fileBasename + timestamp + ext;

            formdata.attributes.name = fileName;
        }
        var req = request(header, function(e, r, body) {
            console.log(e);
            callback(body);
        });

        var form = req.form();
        form.append('attributes', '{ "name" : "' + formdata.attributes.name + '", "parent" : { "id" : "' + values.folderid + '" } }');
        form.append('file', fs.createReadStream(values.filepath));
    });
}

/* gets a file by file name and folder id -- returns null if not found */
function getFileByNameAndFolder(file, folder, options, callback) {
    var fileextension = require('path').extname(file).substring(1);
    var filename = require('path').basename(file).replace(require('path').extname(file), '');

    var header = {
        url: options.base_url + "/search?query=" + filename + "&file_extensions=" + fileextension + "&content_types=name&type=file",
        headers: {
            'Authorization': 'Bearer ' + options.token.access_token
        },
        method: "GET"
    };

    var req = request(header, function(e, r, body) {
        var results = JSON.parse(body);

        if (results.total_count > 0) {
            if (results.total_count > 1) {
                var found = false;

                for (var i = 0; i < results.total_count; i++) {
                    if (results.entries[i].name == require('path').basename(file) && results.entries[i].parent.id == folder) {
                        found = true;
                        callback(results.entries[i]);
                    }
                }
                if (!found) {
                    callback(null);
                }
            } else {
                callback(results.entries[0]);
            }
        } else {
            callback(null);
        }
    });

}

/* Logs the user out of BOX revoking the current token */
function logout(options, callback) {
    var header = {
        url: options.revoke_url,
        method: "POST"
    };

    console.log(header);

    var req = request(header, function(e, r, body) {
        console.log(e);
        callback(body);
    });

    var form = req.form();
    form.append('client_id', options.client_id);
    form.append('client_secret', options.client_secret);
    form.append('token', options.token.access_token);
}

/* Returns box file object based on passed file id */
function getFileInformation(values, options, callback) {
    var url = options.base_url + "/files/" + values.fileid;

    var header = {
        url: url,
        headers: {
            'Authorization': 'Bearer ' + options.token.access_token
        },
        method: "GET"
    };

    var req = request(header, function(e, r, body) {
        console.log(e);
        callback(body);
    });
}

/* Creates a shared link and returns the box file information */
function createSharedLink(values, options, callback) {
    debugger;

    var url = options.base_url + "/files/" + values.fileid;

    if (values.access == undefined) {
        values.access = "open";
    }
    if (values.can_download == undefined) {
        values.can_download = true;
    }

    var header = {
        url: url,
        headers: {
            'Authorization': 'Bearer ' + options.token.access_token
        },
        method: "PUT",
        json: {
            "shared_link": {
                "access": values.access,
                "permissions": {
                    "can_download": values.can_download
                }
            }
        }
    };

    var req = request(header, function(e, r, body) {
        callback(body);
    });
}

/* Downloads or streams file based on values passed */
function getFile(values, options) {
    var url = options.base_url + "/files/" + values.fileid + "/content";

    var header = {
        url: url,
        headers: {
            'Authorization': 'Bearer ' + options.token.access_token
        },
        method: "GET",
        followAllRedirect: true
    };

    var req = request(header).pipe(values.response_stream);
}

/* Using the BOX View api, get thumbnail */
function getThumbnail(values, options) {
    var url = options.base_url + "/files/" + values.fileid + "/thumbnail.png?min_height=256&min_width=256";

    var header = {
        url: url,
        headers: {
            'Authorization': 'Bearer ' + options.token.access_token
        },
        method: "GET",
        followAllRedirect: false
    };

    var bufs = [];
    var req = request(header)
        .on('data', function(d) {
            bufs.push(d);
        })
        .on('end', function() {

            var buf = Buffer.concat(bufs);

            if (this.response.statusCode == 200) {
                if (this.redirects.length == 0 || use_box_generic_thumbnails) {
                    values.response_stream.writeHead(200, {
                        'Content-Length': buf.length,
                        'Content-Type': 'image/png',
                        'content-disposition': 'attachment;filename="tbm.png";'
                    });

                    values.response_stream.write(buf);
                    values.response_stream.end();
                } else {
                    /* FUTURE FUNCTIONALITY : allow overriding of images for BOX */

                    /*
      var contenttype = images[this.response.headers['content-type']];
      
      if(typeof contenttype == "undefined" || contenttype == null) {
        // load default image from box
        values.response_stream.writeHead(200, {
    'Content-Length': buf.length,
    'Content-Type' : 'image/png',
    'content-disposition' : 'attachment;filename="tbm.png";'});
        
        values.response_stream.write(buf);
        values.response_stream.end(); 
      } else {
        // load this image
        fs.readFile(require('path').join(__dirname, "/images/default.png"), function(err, buf) {
        
    values.response_stream.writeHead(200, {
      'Content-Length': buf.length,
      'Content-Type' : 'image/png',
      'content-disposition' : 'attachment;filename="tbm.png";'}
    );
    
    values.response_stream.write(buf);
    values.response_stream.end(); 
        });
      }
      */
                }
            } else if (this.response.statusCode == 202) {
                //thumbnail being generated

                var retry = (parseInt(this.response.headers['retry-after']) * 1000) + 500;

                setTimeout(getThumbnail(values, options), retry);

            } else {
                //thumbnail can't be generated

                get_image_from_file(require('path').join(__dirname, "/images/default.png"), function(buf) {
                    values.response_stream.writeHead(200, {
                        'Content-Length': buf.length,
                        'Content-Type': 'image/png',
                        'content-disposition': 'attachment;filename="tbm.png";'
                    });

                    values.response_stream.write(buf);
                    values.response_stream.end();
                });
            }
        });

}


/* Helper functions */

/* Merges passed in options with default values */
function merge_options(defaults, options) {
    defaults = defaults || {};
    if (options && typeof options === 'object') {
        var keys = Object.keys(options);
        for (var i = 0, len = keys.length; i < len; i++) {
            var k = keys[i];
            if (options[k] !== undefined) defaults[k] = options[k];
        }
    }
    debugger;
    return defaults;
}

/* Returns the content type based on file extension */
function get_content_type(filename) {
    var ext = require('path').extname(filename);

    var retval;

    switch (ext.toLowerCase()) {
        case "jpg":
        case "jpeg":
            {
                retval = "image/jpeg";
                break;
            }
        case "png":
            {
                retval = "image/png";
                break;
            }
        case "gif":
            {
                retval = "image/gif";
                break;
            }
        case "mp4":
            {
                retval = "video/mp4";
                break;
            }
        case "mov":
            {
                retval = "video/mov";
                break;
            }
        default:
            {
                retval = "application/octet-stream";
                break;
            }
    }

    return retval;
}

/* Returns a buffer of the image at the filepath specified */
function get_image_from_file(filepath, callback) {
    fs.readFile(require('path').join(__dirname, "/images/default.png"), function(err, buf) {
        callback(buf);
    });
}

/* Returns a buffer of the image at the URL specified */
function get_image_from_url(url, callback) {
    var bufs = [];
    var req = request.get(url) //'http://mypbs.org/z/d/img/fineFiles/64/default.png'
        .on('data', function(d) {
            bufs.push(d);
        })
        .on('end', function() {
            var buf = Buffer.concat(bufs);
            callback(buf);
            /*
      values.response_stream.writeHead(200, {
  'Content-Length': buf.length,
  'Content-Type' : 'image/png',
  'content-disposition' : 'attachment;filename="tbm.png";'}
      );
      
      values.response_stream.write(buf);
      values.response_stream.end();
      */
        });

}
