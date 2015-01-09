# node-fullbox-api
### A full javascript implementation of the Box.Com API

This is a full cycle implementation of the Box API.  It includes:
* Box Token Request
* Box Refresh Token Request
* Upload file to box
* Retrieve Box file information
* Shared link creation
* Retrieve file from Box
* Retrieve thumbnail of file from Box

More api intergration to come.

## Installation
npm install node-fullbox-api

## Setup and Use

var BOX = require('node-fullbox-api');
var Box = new BOX(box_options);

**Box Options**

{
    authorize_url : _<box authorizarion endpoint>_,
    token_url : _<box token endpoint>_,
    user_name : _<box user name>_,
    password : _<box user password>_,
    client_id : _<box api client id>_,
    client_secret : _<box api client secret>_,
    base_url: _<box content api endpoint>_,
    upload_url: _<box content upload api endpoint>_,
    auto_rename : _<true or false for auto-renaming uploaded files in the case of name collisions>_
}

