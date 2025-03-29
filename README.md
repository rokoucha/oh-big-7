# oh-big-7

![logo](https://i.imgur.com/EO7UoEy.jpeg)

某所の予約を取得してきてiCal形式で出力するWorkerスクリプト

## How to use

某所であれば `https://oh-big-7.rokoucha.workers.dev/ical?credentials=<base64でエンコードしたuser:pass>` で既にデプロイされている環境を使えます。

別な場所で使いたい場合は、自分でデプロイしてください。
`worker-configuration.d.ts` で定義してある環境変数を設定する必要があります。

## License

Copyright (c) 2025 Rokoucha

Released under the MIT license, see LICENSE.
