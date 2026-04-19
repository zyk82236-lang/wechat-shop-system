# WeChat Mini Program

This folder contains the native WeChat mini program MVP scaffold:
- Home / Category / Product Detail / Cart / Checkout / Orders / Order Detail / Profile / Address
- API base URL supports runtime configuration in `我的 -> API 地址` (saved to local storage).
- Payment is integrated via backend `/payments/wechat/params` and `wx.requestPayment`.
- Order flow supports cancel, shipment tracking display, and confirm received.

Import this folder in WeChat DevTools as a mini program project.
