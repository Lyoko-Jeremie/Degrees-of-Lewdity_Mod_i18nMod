// original OutputText -> (dontTrim/Trim) -> match `from:string` -> replace use to string
interface TypeBOutputText {
    from: string;
    to: string;


    searchPatternRegex?: RegExp;
}

function ModI18NTypeB_normalizeSearchPattern(pattern: string): RegExp {
    return new RegExp(ModI18NTypeB_normalizeSearchString(pattern), 'g');
}

// come from GPT-4
function ModI18NTypeB_normalizeSearchString(pattern: string) {
    // 转义正则表达式中的特殊字符
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const p = `[^a-zA-Z0-9_$\{\}\`\"\'\|]${escapedPattern}[^a-zA-Z0-9_$\{\}\`\"\'\|]`;

    // console.log('p:', [p]);

    return p;
}

// come from GPT-4
function ModI18NTypeB_ignoreSpaceString(pattern: string) {
    // 转义正则表达式中的特殊字符
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 转换空格
    // return escapedPattern.replace(/\s+/g, '\\s*');
    // return escapedPattern.split('').map(c => c.trim() ? c + '\\s*' : '').join('');
    const cc = escapedPattern.split('');
    for (let i = 0; i < cc.length; i++) {
        const ct = cc[i].trim();
        if (ct === '') {
            cc[i] = '';
        } else if (ct !== '\\') {
            cc[i] = cc[i] + '\\s*';
        } else {
            cc[i] = cc[i];
        }
    }
    return ['\\s*', ...cc, '\\s*'].join('');
}

// GPT-4
function fuzzyMatchManual(strA: string, strB: string, startIndex = 0) {
    let j = startIndex;

    // 去除字符串B中的空白字符
    const b = strB.replace(/\s+/g, '');

    for (let i = 0; i < b.length; i++) {
        // 跳过字符串A中的空白字符
        while (j < strA.length && /\s/.test(strA[j])) {
            j++;
        }

        // 如果字符串A已经结束，但字符串B还没有，返回-1
        if (j >= strA.length) return -1;

        // 比较两个字符，如果不同，返回-1
        if (strA[j] !== b[i]) return -1;

        j++;
    }

    return j;
}

// original StoryScript -> (dontTrim/Trim) -> (dontTrimTag/TrimTag) Trim or not in original string -> match `from:string` -> notMatchRegex filer -> replace use to string
interface TypeBInputStoryScript {
    from: string;
    to: string;

    // the passage name, only use in passage match mode
    // example:
    //      a mark:                `:: Start2 [nosave exitCheckBypass]`
    //      its massage name:         `Start2`
    passageName: string;

    // pos in passage
    pos: number;

    searchPatternRegex?: RegExp;
}

class ModI18NTypeB_OutputTextMatcher {

    m: Map<string, TypeBOutputText>;
    fastTest: RegExp;

    constructor(
        public mt: TypeBOutputText[],
    ) {
        console.log('ModI18NTypeB_OutputTextMatcher constructor', [mt]);
        this.m = new Map<string, TypeBOutputText>(
            this.mt.map((v) => {
                return [ModI18NTypeB_normalizeSearchString(v.from.trim()), v];
            }),
        );
        this.fastTest = new RegExp(Array.from(this.m.keys()).join("|"), 'g');
    }

    tryReplace(text: string) {
        if (!text.trim()) {
            return text;
        }

        // come from GPT-4
        if (this.fastTest.test(text)) {

            let matches = [];
            let match;
            while ((match = this.fastTest.exec(text)) !== null) {
                matches.push({index: match.index, value: match[0]});
            }
            // 按照在 strA 中的起始位置排序
            matches.sort((a, b) => a.index - b.index);
            // 用于记录哪些索引已经被替换过，以避免重叠替换
            let replacedIndices = new Set<number>();

            let s = text;
            for (const m of matches) {
                let overlap = false;

                for (let i = m.index; i < m.index + m.value.length; i++) {
                    if (replacedIndices.has(i)) {
                        overlap = true;
                        break;
                    }
                }

                if (!overlap) {
                    let before = s.substring(0, m.index);
                    let after = s.substring(m.index + m.value.length);
                    s = before + this.m.get(m.value)!.to + after;

                    for (let i = m.index; i < m.index + this.m.get(m.value)!.to.length; i++) {
                        replacedIndices.add(i);
                    }
                }
            }

        }


        return text;
    }

}

class ModI18NTypeB_PassageMatcher {
    constructor(
        public mt: TypeBInputStoryScript[],
    ) {
        console.log('ModI18NTypeB_PassageMatcher constructor', [mt]);
        this.passagebuffer = new Map<string, TypeBInputStoryScript[]>();

        mt.forEach((v) => {
            // console.log('ModI18NTypeB_PassageMatcher constructor', [v.from], rs);
            if (this.passagebuffer.has(v.passageName)) {
                this.passagebuffer.get(v.passageName)!.push(v);
            } else {
                this.passagebuffer.set(v.passageName, [v]);
            }
        });
        for (const [k, v] of this.passagebuffer) {
            this.passagebuffer.set(k, v.sort((a, b) => {
                    // big to small
                    return b.pos - a.pos;
                }),
            );
        }
    }

    passagebuffer: Map<string, TypeBInputStoryScript[]>;

    getByPassage(passageName: string | '' | undefined | null) {
        if (passageName) {
            const pp = this.passagebuffer.get(passageName);
            if (pp) {
                return pp;
            }
            // console.log('cannot find passage:', passageName);
        }
        return undefined;
    }

    replacePassageContent(passageName: string, passageContent: string) {
        const pp = this.getByPassage(passageName);
        if (pp) {
            let s = passageContent;
            // console.log('ModI18NTypeB_PassageMatcher replacePassageContent passageName:', passageName);
            // console.log('ModI18NTypeB_PassageMatcher replacePassageContent before:', [s]);
            for (const v of pp) {
                // console.log(v.passageName, v.pos, v.from.length);

                // TODO NOTE this is a temp fix
                // s = s.substring(0, Math.max(0, v.pos - 2)) + v.to + s.substring(Math.max(0, v.pos - 1) + v.from.length);

                // s = s.substring(0, v.pos) + v.to + s.substring(v.pos + v.from.length);
                if (s.substring(v.pos, v.pos + v.from.length) === v.from) {
                    s = s.substring(0, v.pos) + v.to + s.substring(v.pos + v.from.length);
                } else if (s.substring(v.pos - 1, v.pos + v.from.length - 1) === v.from) {
                    s = s.substring(0, v.pos - 1) + v.to + s.substring(v.pos - 1 + v.from.length);
                } else if (s.substring(v.pos - 2, v.pos + v.from.length - 2) === v.from) {
                    s = s.substring(0, v.pos - 2) + v.to + s.substring(v.pos - 2 + v.from.length);
                } else if (s.substring(v.pos + 1, v.pos + v.from.length + 1) === v.from) {
                    s = s.substring(0, v.pos + 1) + v.to + s.substring(v.pos + 1 + v.from.length);
                } else if (s.substring(v.pos + 2, v.pos + v.from.length + 2) === v.from) {
                    s = s.substring(0, v.pos + 2) + v.to + s.substring(v.pos + 2 + v.from.length);
                } else {
                    console.error('ModI18NTypeB_PassageMatcher replacePassageContent cannot find: ',
                        [v.from], ' in ', [passageName], ' at ', [v.pos], ' in ', [s.substring(v.pos - 10, v.pos + v.from.length + 10)]);
                }

                // let re: RegExp | undefined = new RegExp(ModI18NTypeB_ignoreSpaceString(v.from), '');
                // re.lastIndex = v.pos - 2;
                // const mm = re.exec(s);
                // if (mm) {
                //     if (mm.index > v.pos + 5) {
                //         // too far
                //     } else {
                //         re.lastIndex = v.pos - 2;
                //         s = s.replace(re, v.to);
                //     }
                // }
                // re = undefined;

                // const lastI = fuzzyMatchManual(s, v.from, Math.max(0, v.pos - 2));
                // if (lastI !== -1) {
                //     s = s.substring(0, Math.max(0, v.pos - 2)) + v.to + s.substring(lastI + v.from.length);
                // }
            }
            // console.log('ModI18NTypeB_PassageMatcher replacePassageContent after:', [s]);
            return s;
        }
        return passageContent;
    }

}

class ModI18NTypeB {

    constructor(
        public OutputText: TypeBOutputText[],
        public InputStoryScript: TypeBInputStoryScript[],
    ) {
        this.outputTextMatchBuffer = new ModI18NTypeB_OutputTextMatcher(OutputText);
        this.inputStoryMatchBuffer = new ModI18NTypeB_PassageMatcher(InputStoryScript);

        // monky patch
        console.log('TypeB constructor monky patch document.createTextNode');
        // this.oCreateTextNode = document.createTextNode;
        // document.createTextNode = (text: string) => {
        //     return this.oCreateTextNode.call(document, this.replaceOutputText(text));
        // };
    }

    public oCreateTextNode!: typeof document.createTextNode;

    public outputTextMatchBuffer: ModI18NTypeB_OutputTextMatcher;
    public inputStoryMatchBuffer: ModI18NTypeB_PassageMatcher;

    replaceOutputText(text: string): string {
        if (!text.trim()) {
            // empty string
            return text;
        }
        // console.log('replaceOutputText input text ==>>', [text], text);
        try {
            return this.outputTextMatchBuffer.tryReplace(text);
        } catch (e) {
            console.error(e);
            return text;
        }
    }

    replaceInputStoryScript(text: string, passageName: string): string {
        if (!text.trim()) {
            // empty string
            return text;
        }
        if (passageName) {
            try {
                return this.inputStoryMatchBuffer.replacePassageContent(passageName, text);
            } catch (e) {
                console.error(e);
            }
        }
        return text;
    }

}
