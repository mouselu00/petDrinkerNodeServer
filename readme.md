# NodeJS + MQTT + RaspberryPi 3

## 簡介
將`Node`伺服器建立在`raspberry pi 3`上運行，並且透過`MQTT`來互傳數據到終端設備上

## Raspberry Pi 3 架構
在樹莓派3的設備只只是要添加了多一個**網路介面卡**，原因在於:

1.  原網路介面卡用於設定成為無線網路熱點
2.  外接網路介面卡用於連接外網

## 整體運作邏輯
整體的運作流程有些許複雜，本人負責的事項可整理歸納成幾項：
-   讓樹莓派可搜尋附近無線網路（WIFI）,並且選擇連線
-   將接收到的數據透過樹莓派發送到終端設備的應用程式上
-   等待接受終端設備上的應用程式的數據發送過來將其做邏輯處理
-   透過GPIO按鈕能手動的開啟或關閉樹莓派上的熱點狀態（開/關）

## 使用的`NPM`包
-   pi-wifi
    -   讓樹莓派可以在搜尋附近無線網路並且連接
-   onoff
    -   樹莓派上配置按鈕，透過此包可以偵測按鈕的狀態
-   mqtt
    -   `MQTT.js`的包，讓`nodeJS`可以與其溝通、監聽、觸發事件等等
-   serialport
    -   因為原數據來自`arduino`的偵測反饋數據，透過`USB`的方式用`Serial Port`發送到樹莓派，所以`nodeJS`使用此包來接受`arduino`的數據或發送數據
-   pigpio
    -   讓樹莓派上的`GPIO`腳位可以透過`nodeJS`中做控制
-   express
    -   `nodeJS`的伺服器
-   child_process
    -  讓`nodeJS`可執行`shell script`
-   path
    -   路徑
-   fs
    -   讀寫文件
-   body-parser
    -   轉換數據格式
-   axios
    -   設定介面的數據發送和接受

> `package.json`上有有誤，請執行安裝


## 無線網路設定介面
該介面使用的是`vueJS`構建的，當中有使用到了`webstorage`的`indexeddb`.

