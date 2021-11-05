// image-url-workbench からコピー
//-- ここから
const regExpPlus = /\+/g
const regExpSlash = /\//g
const regExpTrailEq = /=+$/g

const regExpHyphen = /-/g
const regExpLowDash = /_/g

export function encodeBase64Url(v: string): string {
  // https://docs.imgix.com/apis/rendering#base64-variants
  // https://developer.mozilla.org/ja/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
  // https://stackoverflow.com/questions/24523532/how-do-i-convert-an-image-to-a-base64-encoded-data-url-in-sails-js-or-generally
  // https://qiita.com/awakia/items/049791daca69120d7035
  return Buffer.from(`${v}`, 'utf-8')
    .toString('base64')
    .replace(regExpSlash, '_')
    .replace(regExpPlus, '-')
    .replace(regExpTrailEq, '')
}

export function decodeBase64Url(v: string): string {
  // 末尾の = は足さなくてもエラー等にはならないもよう
  return Buffer.from(
    v.replace(regExpHyphen, '+').replace(regExpLowDash, '/'),
    'base64'
  ).toString()
}
//-- ここまで

export function editQuery(
  start: string,
  url: string,
  params: string,
  replace?: boolean
): string {
  if (url.startsWith(start)) {
    const u = url.split('?', 2)
    const srcQ = new URLSearchParams(replace ? '' : u[1] || '')
    const q = new URLSearchParams(params)
    q.forEach((v, k) => {
      if (srcQ.has(k)) {
        srcQ.set(k, v)
      } else {
        srcQ.append(k, v)
      }
    })
    const p = srcQ.toString()
    if (p) {
      return `${u[0]}?${p}`
    }
    return u[0]
  }
  return url
}

export function encodeQuery(params: Record<string, any>): string {
  const q = new URLSearchParams(params) // base64 にはしない.
  return q.toString()
}

const b64variantRegExp = /^(.+)64$/
export function toModifiers(query: string): Record<string, any> {
  const ret: Record<string, any> = {}
  const q = new URLSearchParams(query)
  q.forEach((v, k) => {
    let key = k
    let value = v
    // nuxt-image では Base64 Variants が扱われないようなので(fit64 がパススルー状態になる)戻す.
    const m = k.match(b64variantRegExp)
    if (m) {
      key = m[1]
      value = decodeBase64Url(v)
    }
    ret[key] = value
  })
  return ret
}
