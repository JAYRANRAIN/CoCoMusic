/**
 *
 *          ┌─┐       ┌─┐
 *       ┌──┘ ┴───────┘ ┴──┐
 *       │                 │
 *       │       ───       │
 *       │  ─┬┘       └┬─  │
 *       │                 │
 *       │       ─┴─       │
 *       │                 │
 *       └───┐         ┌───┘
 *           │         │
 *           │         │
 *           │         │
 *           │         └──────────────┐
 *           │                        │
 *           │                        ├─┐
 *           │                        ┌─┘
 *           │                        │
 *           └─┐  ┐  ┌───────┬──┐  ┌──┘
 *             │ ─┤ ─┤       │ ─┤ ─┤
 *             └──┴──┘       └──┴──┘
 * qqmusic 的垃圾吃屎 api 我做错了什么为什么要我爬这种api 啊啊啊啊啊啊啊啊啊
 * 终于知道为什么没人去搞 qqmusic 的 api 了，这智障 api 里面掺了屎，好辣瞎我们的狗眼，让我们不能爬
 */
import request from 'axios'
import {Singer, Album, Music, Mv} from './commonObject'

request.defaults.adapter = require('axios/lib/adapters/http')

const baseRequest = request.create({
  headers: {
    'Referer': 'http://y.qq.com/portal/player.html',
    'User-Agent': 'user-agent:Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36'
  },
  timeout: 8000 // 这个时间不好把握，我只能说小霸王服务器该换了
})

// page 从 1 开始
export async function getSingerList ({page, country, name}) {
  let url = `https://c.y.qq.com/v8/fcg-bin/v8.fcg?channel=singer&page=list&key=${country}_${name}&pagesize=100&pagenum=${page}&format=jsonp`
  /* eslint-disable */
  let {data: {list, total_page}} = (await baseRequest(url)).data 
  return {
    totalPage: total_page, 
    singerList: list.map(({Fsinger_name, Fsinger_mid}) => new Singer(Fsinger_name, Fsinger_mid))
  }
  /* eslint-disable */
}

// page 从 0 开始
export async function getSingerMusicList ({page, singerMid}) {
  let url = `https://c.y.qq.com/v8/fcg-bin/fcg_v8_singer_track_cp.fcg?&singermid=${singerMid}&order=listen&begin=${page*30}&num=30`
  let {data: {list, total}} = (await baseRequest(url)).data
  return {
    musicTotal: Math.floor(total / 30),
    musicList: list.map(({musicData: {songmid, strMediaMid, songname, albumname, albummid, singer, type}}) => new Music(songname, songmid, strMediaMid, new Album(albumname, albummid), singer.map(({mid, name}) => new Singer(name,mid)), type))
  }
}

export async function getSingerInfo ({singerMid}) {

  function parseUserInfo (list) {
    let result = {}
    list.forEach(e => {
      result[e.key] = e.value[0]
    })
    return result
  }

  let url = `https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_singer_desc.fcg?singermid=${singerMid}&utf8=1&outCharset=utf-8&format=xml`
  var parseString = require('xml2js').parseString;
  var xml = ((await (baseRequest(url))).data)
  return await new Promise((resolve, reject) => {
    parseString(xml, function (err, result) {
      if (err) {
        reject(err)
        return
      }
      if(!result.result.data[0].info){
        resolve({
          info: { 
            'T_T': '暂时没有该歌手的信息'
          }
        })
        return
      }
      let {basic, other, desc} = result.result.data[0].info[0]
      resolve({
        info: parseUserInfo(basic[0].item),
        desc: desc && desc[0],
        other: parseUserInfo(other[0].item)
      })
    })
  })
}
export let getSingerAlbumList = async function ({singerMid, page}) {
  let url = `https://c.y.qq.com/v8/fcg-bin/fcg_v8_singer_album.fcg?singermid=${singerMid}&order=time&begin=${page * 30}&num=30`
  let {list, total} = (await baseRequest(url)).data.data
  return {
    albumTotal: Math.floor(total / 30),
    albumList: list ? list.map(({albumMID, albumName}) => new Album(albumName, albumMID)) : []
  }
}
export async function getSingerMvList ({singerMid, page}) {
  // cid  是啥？ 我也不知道，我也很绝望啊，https://y.gtimg.cn/music/portal/js/v4/singer_afadc5b.js?max_age=31536000 代码里面直接写死了的，我好慌
  let url =  `https://c.y.qq.com/mv/fcgi-bin/fcg_singer_mv.fcg?singermid=${singerMid}&order=listen&begin=${page * 35}&num=35&cid=205360581`
  let {list, total} = (await baseRequest(url)).data.data
  return {
    mvTotal: Math.floor(total / 35),
    mvList: list ? list.map(({title, pic, vid}) => new Mv(title, pic, vid)) : []
  }
}

export async function getMvInfo ({mvId}) {
  let url = `https://u.y.qq.com/cgi-bin/musicu.fcg?data=%7B%22getMvInfo%22%3A%7B%22module%22%3A%22MvService.MvInfoProServer%22%2C%22method%22%3A%22GetMvInfoList%22%2C%22param%22%3A%7B%22vidlist%22%3A%5B%22${mvId}%22%5D%7D%7D%7D`
  let {name, vid, cover_pic, fileid} = (await baseRequest(url)).data.getMvInfo.data.mvlist[0]
  return {
    mv: new Mv(name, cover_pic, vid),
    fileid
  }
}
export async function getMUrl ({fileid}) {
  let url = `https://u.y.qq.com/cgi-bin/musicu.fcg?data=%7B%22getMvUrl%22%3A%7B%22module%22%3A%22Mv.MvDownloadUrlServer%22%2C%22method%22%3A%22GetMvUrls%22%2C%22param%22%3A%7B%22fileid%22%3A%5B%22${fileid}%22%5D%2C%22filetype%22%3A%5B-1%5D%7D%7D%7D`
  let {cn, url: [mvSourceUrl], vkey} = (await baseRequest(url)).data.getMvUrl.data.data[fileid][2]
  return {
    cn, mvSourceUrl, vkey
  }
}

export async function getSongVkey({fileName, guid, songMid}) {
  // cid 是啥？ 我也不造啊 qq 那群人写死了
  let url =  `https://c.y.qq.com/base/fcgi-bin/fcg_music_express_mobile3.fcg?cid=205361747&songmid=${songMid}&filename=${fileName}&guid=${guid}`
  let {vkey} = (await baseRequest(url)).data.data.items[0]
  return {vkey}
}
// 从 1 开始
export async function getSearch ({keyword, page}) {
  let url = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?new_json=1&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p=${page}&n=20&w=${encodeURIComponent(keyword)}&needNewCode=0`
  let {zhida, song: {list, totalnum, curpage}} = JSON.parse((await baseRequest(url)).data.slice(9, -1)).data // zhida ？ 直达 api 里面有中文 
  let direct
  switch (zhida.type) {
    case 1:
      direct = new Singer(zhida.zhida_singer.singerName, zhida.zhida_singer.singerMID)
      break;
    case 2:
      direct = new Album(zhida.zhida_album.albumName, zhida.zhida_album.albumMID)
      break;
  }
  return {direct, totalPage: Math.ceil(totalnum / 20),
    songList: list.map(({name, mid, file: {media_mid}, singer, album, type}) => new Music(name, mid, media_mid, new Album(album.name, album.mid), singer.map(singerItem => new Singer(singerItem.name, singerItem.mid)), type))
  }
}