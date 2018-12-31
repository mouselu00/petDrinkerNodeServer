
var axios = import('./axios');


function wifiScan(){
    axios.post('/wifis')
        .then(function (response) {
            console.log(response);
          })
        .catch(function (error) {
            console.log(error);
          })
}