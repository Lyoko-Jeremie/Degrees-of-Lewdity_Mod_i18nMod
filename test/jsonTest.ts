/// <reference path="../../../dist-BeforeSC2/SC2DataManager.d.ts" />
/// <reference path="../../../dist-BeforeSC2/Utils.d.ts" />
/// <reference path="../../../dist-BeforeSC2/ModLoader.d.ts" />
/// <reference path="../src/winDef.d.ts" />
/// <reference path="../dist/typeB.d.ts" />

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import _ from "lodash";
const { Writable } = require('stream');
const { pipeline } = require('stream');



import {JSONParser} from "@streamparser/json";

const lodash = _;
function checkItem(t: any): t is TypeBInputStoryScript {
    let c = t
        && lodash.isString(lodash.get(t, 'f'))
        && lodash.isString(lodash.get(t, 't'))
        && lodash.isNumber(lodash.get(t, 'pos'));
    if (t.passageName) {
        c = c && lodash.isString(t.passageName);
    }
    if (lodash.has(t, 'pN')) {
        c = c && lodash.isString(lodash.get(t, 'pN'));
    }
    if (t.css || t.js) {
        c = c && lodash.isString(t.fileName);
    }
    // console.log('checkItem', [c, [
    //     lodash.isString(lodash.get(t, 'f')),
    //     lodash.isString(lodash.get(t, 't')),
    //     lodash.isNumber(lodash.get(t, 'pos')),
    //     t.passageName ? lodash.isString(t.passageName) : true,
    //     lodash.has(t, 'pN') ? lodash.isString(lodash.get(t, 'pN')) : true,
    //     t.css || t.js ? lodash.isString(t.fileName) : true,
    // ]]);
    return c;
}

function checkAndProcessData(T: any): [TypeBOutputText[], TypeBInputStoryScript[]] | undefined {
    if (T && T.typeB && T.typeB.TypeBOutputText && T.typeB.TypeBInputStoryScript) {
        const cacheTypeBOutputText = T.typeB.TypeBOutputText.map((T: any) => {
            if (!checkItem(T)) {
                console.error('I18NMod checkAndProcessData TypeBOutputText (!this.checkItem(T))', T);
            }
            //下面的写法最终占用 134 MB
            return {
                from: T.f,
                to: T.t,
                pos: T.pos,
                fileName: T.fileName,
                js: T.js
            };
            //下面的写法最终占用 142 MB
            return Object.assign(T, {
                from: T.f,
                to: T.t,
            });
        });
        const cacheTypeBInputStoryScript = T.typeB.TypeBInputStoryScript.map((T: any): TypeBInputStoryScript => {
            if (!checkItem(T)) {
                console.error('I18NMod checkAndProcessData TypeBInputStoryScript (!this.checkItem(T))', T);
            }
            //下面的写法最终占用 134 MB
            return {
                from: T.f,
                to: T.t,
                pos: T.pos,
                fileName: T.fileName,
                passageName: T.pN
            };
            //下面的写法最终占用 142 MB
            return Object.assign(T, {
                from: T.f,
                to: T.t,
                passageName: T.pN,
            } as TypeBInputStoryScript);
        });

        return [cacheTypeBOutputText, cacheTypeBInputStoryScript];
    }
    return undefined;
}

;(async () => {
    const parser = new JSONParser({
        stringBufferSize: 1024,
        keepStack: false,
        paths: ['$.typeB.TypeBOutputText.*', '$.typeB.TypeBInputStoryScript.*']
    });
    let resultB : TypeBOutputText[]= [];
    let resultBInput : TypeBInputStoryScript[] = [];

    var maxusage = 0;
    parser.onValue = ({value, key, parent, stack}) => {
        if(stack.length < 2) return;
        if (stack[2].key === 'TypeBOutputText'){
            if (checkItem(value)) {

                //上面的写法会占用 150。3 MB的内存
                /*
                resultB.push(Object.assign(value, {
                    // @ts-ignore
                    from: value.f,
                    // @ts-ignore
                    to: value.t,
                }));*/
                //下面的写法会占用 144.07MB的内存

                resultB.push({
                    // @ts-ignore
                    from: value.f,
                    // @ts-ignore
                    to: value.t,
                    // @ts-ignore
                    pos: value.pos,
                    fileName: value.fileName,
                    js: value.js
                });
            }
        }
        else if(stack[2].key === 'TypeBInputStoryScript')
        {
            if (checkItem(value)) {/*
                resultB.push(Object.assign(value, {
                    // @ts-ignore
                    from: value.f,
                    // @ts-ignore
                    to: value.t,
                    // @ts-ignore
                    passageName: value.pN,
                }));*/


                resultBInput.push({
                    // @ts-ignore
                    from: value.f,
                    // @ts-ignore
                    to: value.t,
                    // @ts-ignore
                    pos: value.pos,
                    fileName: value.fileName,
                    // @ts-ignore
                    passageName: value.pN
                });
            }
        }
        if (parent !== undefined) {
            //console.log(parent.length);
            //const used = process.memoryUsage().heapUsed / 1024 / 1024;
            //if (used > maxusage)
            //    maxusage = used;
            parent.length = 0;
        }
    };

// Or passing the stream in several chunks
    try {

        const jsonPath = process.argv[2];
        console.log('jsonPath', jsonPath);
        if (!jsonPath) {
            console.error('no jsonPath');
        }
        {

            const used = process.memoryUsage().heapUsed / 1024 / 1024;
            console.log(`The script uses before read  ${Math.round(maxusage * 100) / 100} MB`);
        }

        if (false)
        {
            //这个代码段测试流式情况下的峰值内存占用
            //流式的情况下，内存占用为 53.31MB，远小于原本的大小
            const readStream = fs.createReadStream(jsonPath, {encoding: 'utf-8'});

            readStream.on('data', (chunk) => {
                // 处理每一个数据块
                parser.write(chunk);
            });
            // 创建一个“空操作”的可写流
            const noopWritable = new Writable({
                write(chunk: any, encoding: any, callback: () => void) {
                    // 这里不做任何操作，只是调用回调函数
                    callback();
                }
            });
            const pipelineAsync = promisify(pipeline);
            await pipelineAsync(readStream, noopWritable);
            {
                const used = process.memoryUsage().heapUsed / 1024 / 1024;
                if (used > maxusage)
                    maxusage = used;
            }
            console.info('Size:' + resultB.length + ' ' + resultBInput.length);
        }
        else {
            const jsonF = await promisify(fs.readFile)(jsonPath, {encoding: 'utf-8'});
            //通过上面的parser解码完后是 135.31 MB
            parser.write(jsonF);
            console.info('Size:' + resultB.length + ' ' + resultBInput.length);

            //如果直接通过下面的代码进行parse，会直接占用约 40MiB(124.46MB) 的内存，在不进行任何解码操作的前提下
            //解码完成后则是占用 142.87MB
            //优化后占用可以降低到 134 MB
            /*
            let i18nJson;
            try {
                i18nJson = JSON.parse(jsonF);
            } catch (e) {
                console.error(e);
            }
            const cc = checkAndProcessData(i18nJson);*/
            {
                const used = process.memoryUsage().heapUsed / 1024 / 1024;
                if (used > maxusage)
                    maxusage = used;
            }
        }

        // onValue will be called 3 times:
        // "a"
        // ["a"]
        // { test: ["a"] }
    } catch (err) {
        console.log(err); // handler errors
    }


    console.log(`The script uses max  ${Math.round(maxusage * 100) / 100} MB`);
})().catch((e) => {
    console.error(e);
});
