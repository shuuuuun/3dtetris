var domain = "https://shuuuuun.github.io";
var url = domain + "/tetricus/";
// var url = "http://192.168.1.4:3600/";
var meta_description = "Tetricus. This is a simple 3D puzzle game! Play it on your smartphone!";

module.exports = {
  domain: domain,
  url: url,
  
  site_name: "Tetricus",
  title: "Tetricus",
  
  meta_description: meta_description,
  meta_keywords: ["tetricus", "3d", "puzzle", "game", "tetris"],
  
  share_image: url + "img/ogp.png",
  
  og_description: meta_description,
  og_image_width: 1200,
  og_image_height: 630,
  
  tw_description: meta_description,
  tw_hashtags: ["tetricus"],
  // tw_site: "@hoge",
  // tw_creator: "@hoge",
  
  // line_description: meta_description + " " + url,
  
  fb_appid: "106746043168529",
  
  favicon_url: url + "img/icon_t.png",
  apple_touch_icon_url: url + "img/icon.png",
};
