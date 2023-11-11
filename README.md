Degrees-of-Lewdity CHS I18N Mod

Degrees-of-Lewdity 中文汉化Mod

---


编译脚本

```shell
yarn run ts:build
yarn run build:webpack
```

---


`i18n.json` file format :

```json
{
  "typeB": {
    "TypeBOutputText": [
      {
        "pos": 7016,   // postion (startr from file, include `\n\t`)
        "f": "\"sienna\": [\"#A0522D\", \"hue-rotate(305deg) brightness(100%) saturate(70%) contrast(117%)\", \"sienna\"],",    // from
        "t": "\"sienna\": [\"#A0522D\", \"hue-rotate(305deg) brightness(100%) saturate(70%) contrast(117%)\", \"赭色\"],",      // to
        "fileName": "color-namer.js",    // fileName
        "js": true    // is js file
      }
    ],
    "TypeBInputStoryScript": [
      {
        "pos": 210,   // postion (after passage `: passage name` line, include `\n\t`)
        "pN": "Upgrade Waiting Room",   // passage name
        "f": "Remember to update your save if things appear to be working.",    // from
        "t": "别忘了在结束后更新你的存档。",    // to
        "fileName": "waiting-room.twee"     // fileName (optional)
      }
    ]
  }
}
```
