拼文博客系统
----------

## Fork 本库，建立自己的博客系统

操作步骤如下：

第 1 步，在 github.com 打开本库，即 [rewgt/blogs](https://github.com/rewgt/blogs)，点击右上角的 fork 按钮，将本库 fork 到您自己的账号下。

Fork 后，您应能按如下地址访问自己的 github 博客主页：

```
https://<your_account>.github.io/blogs/
```

第 2 步，在本机安装 shadow-widget 运行环境

``` bash
mkdir user
cd user
git clone https://github.com/rewgt/shadow-server.git
```

第 3 步，在本机克隆刚 fork 过来的 blogs 项目

``` bash
git clone https://github.com/<your_account>/blogs.git
```

第 4 步，在本机创建博客

在本机启动一个 server：

``` bash
cd shadow-server
npm start
```

然后在浏览器访问 blogs 主页：`http://localhost:3000/blogs/`，创建、编辑、管理博客在该主页下进行。发布博客只需用 `git push` 命令把本机的 repository 提交到 github。

## 本库博客地址

<a target="_blank" rel="noopener" href="https://rewgt.github.io/blogs/">https://rewgt.github.io/blogs/</a>

如何撰写拼文，如何管理博客，如何提交等，在此博客的 `"Online help"` 子项里有介绍。

&nbsp;
