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
    authorize_url : <box authorizarion endpoint>,  
    token_url : <box token endpoint>,  
    user_name : <box user name>,  
    password : <box user password>,  
    client_id : <box api client id>,  
    client_secret : <box api client secret>,  
    base_url: <box content api endpoint>,  
    upload_url: <box content upload api endpoint>,  
    auto_rename : <true or false> (auto-renaming uploaded files in the case of name collisions)  
    }  

### Functions

All of the functions first check for a valid token.  If one is not found it first tries to refresh the last token, otherwise makes a request for a new token.

**Box.uploadfile(values, callback);**  

Function to upload a file to Box.  The JSON returned is identical to the JSON the standard API returns.

Values  
    
    {  
    filename : <name of file to be uploaded>,  
    folderid : <Box folder id to upload file to>,  
    filepath : <path to file to be uploaded>  
    }  

Callback

    function(data) {
        /* data is the json data returned for the box file */
    }

**Box.getfileinfo(values, callback);**  

Function to get file information from Box.  The JSON returned is identical to the JSON the standard API returns.

Values  
    
    {  
    fileid : <Box file id>
    }  

Callback

    function(data) {
        /* data is the json data returned for the box file */
    }

**Box.createsharedlink(values, callback);**  

Creates a shared link for a box file.  The JSON returned is identical to the JSON the standard API returns.

Values  
    
    {  
    fileid : <Box file id>,
    access : <access type to grant>, /* open, company, collaborators, null (default is open, null removes shared link) */
    can_download : <true or false> /* determines of downloads of file is available */    
    }  

Callback

    function(data) {
        /* data is the json data returned for the box file */
    }

**Box.getthumbnail(values);**  

Returns a stream of the image thumbnail for a file in box.  If the file is an image or movie type a thumbnail will be returned.  If not an image or movie, the file type icon from box will be returned, otherwise a generic default image is returned.

Values  
    
    {  
    fileid : <Box file id>,
    response_stream : <the writable stream where to pipe the servers response, which is the image bytes>    
    }  
