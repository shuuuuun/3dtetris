##はじめてのクロージャ

<p style="font-size: 20px;">
    2015/09/02 もとき
</p>

---

###今日のキーワード

<!-- - クロージャ -->
<!-- - 隠蔽 -->
- スコープ
- 関数の中の関数
<!-- - 関数を返す関数 -->
- 状態を保持する関数


---

###クロージャとは？

<br>
まずはWikipediaですよね。

<blockquote style="font-size: 25px; text-align: left; margin-left: 0; width: 90%;">
    関数閉包はプログラミング言語における関数オブジェクトの一種。引数以外の変数を実行時の環境ではなく、自身が定義された環境（静的スコープ）において解決することを特徴とする。
    ...wikipediaより
</blockquote>

---

###？？？

---

###クロージャとは？

<br>
気を取り直して、はてなキーワード。

<blockquote style="font-size: 25px; text-align: left; margin-left: 0; width: 90%;">
    閉包。関数内に出現する自由変数（関数内で宣言されていない変数）の解決の際、実行時の環境ではなく、関数を定義した環境の変数を参照できるようなデータ構造。
    ...Hatena Keywordより
</blockquote>


---

###・・・

---

###つくってみよう

よくわからないので、とりあえず作ってみましょう。

---

###つくってみよう

数字をカウントアップする関数を作ってみます。

```
var num = 0;
function countup(){
    return ++num;
}
```

できた。動かしてみます。

```
console.log( countup() );  // => 1
console.log( countup() );  // => 2

num = 0;  // ←

console.log( countup() );  // => 1
```

あれれ。

<!-- カウントアップする関数なのに、途中で0に戻ってしまいました。 -->

---

###つくってみよう

変数の<b>スコープ</b>を切って、上書きされないようにしよう。

```
// var num = 0;
function countup(){
    var num = 0;  // ← 移動
    return ++num;
}
```

動かしてみよう。

```
console.log( countup() );  // => 1
console.log( countup() );  // => 1
num = 0;
console.log( countup() );  // => 1
```

できない。（そりゃそうだ）

<br>
スコープは切れてるけど、
状態が保持されていない。
<!-- （毎回初期化されている） -->


---

###つくってみよう

そこでクロージャ。

```
var countup = (function(){
    var num = 0;
    return function(){
        return ++num;
    }
})();
```

実行すると、

```
console.log( countup() );  // => 1
console.log( countup() );  // => 2
num = 0;
console.log( countup() );  // => 3
```

おっ

できた。

---

###つくってみよう

```
// 最初のコード
var num = 0;
function countup(){
    return ++num;
}

// 2番目のコード
function countup(){
    var num = 0;
    return ++num;
}

// クロージャ
var countup = (function(){
    var num = 0;
    return function(){
        return ++num;
    }
})();
```

最初のコードと2番目のコードをくっつけた感じ？


---

###つまり、クロージャとは

<!-- 最初のコードを、functionでラップしてる感じ？
関数で包んで、スコープを切ることで、変数を隠蔽して、安全性を保っています。
クロージャの中のnum変数には何人たりともアクセスできません。 -->
<!-- スコープ
関数の中の関数
関数を返す関数
状態を保持する関数 -->

```
var countup = (function(){
    var num = 0;  // スコープが切れてて
    return function(){  // 関数の中に関数があって
        return ++num;
    }
})();

console.log( countup() );  // => 1
console.log( countup() );  // => 2  状態を保持できる構造

num = 0;
console.log( countup() );  // => 3  （スコープ切れてる）
```



---

<!-- ###まとめ -->

###今日のキーワード

<!-- - クロージャ -->
<!-- - 隠蔽 -->
- スコープ
- 関数の中の関数
<!-- - 関数を返す関数 -->
- 状態を保持する関数

---

###ありがとうございました。


---

####参考

<p style="font-size: 24px;">
Wikipedia<br>
https://ja.wikipedia.org/wiki/%E3%82%AF%E3%83%AD%E3%83%BC%E3%82%B8%E3%83%A3<br>
<br>
はてなキーワード<br>
http://d.hatena.ne.jp/keyword/%A5%AF%A5%ED%A1%BC%A5%B8%A5%E3<br>
<br>
MDN<br>
https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures<br>
<br>
猿でもわかるクロージャ超入門<br>
http://dqn.sakusakutto.jp/2009/01/javascript_5.html<br>
<br>
JavaScriptでクロージャ入門<br>
http://qiita.com/takeharu/items/4975031faf6f7baf077a<br>
<br>
クロージャを使ったプライベート関数の隠蔽について<br>
http://satoshi.blogs.com/life/2007/12/javascript-2.html<br>
<br>
うひょひょ<br>
http://uhyohyo.net/javascript/9_5.html<br>
</p>

