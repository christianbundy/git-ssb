var pull = require('pull-stream')
var paramap = require('pull-paramap')
var u = require('./util')
var getAbout = require('ssb-avatar')
var PRs = require('ssb-pull-requests')

module.exports = function (argv) {
  process.stderr.write('Loading pull requests...\r')
  var headRepo = u.repoId(u.getRemoteUrl(argv._[0])) || u.getDefaultRemote()
  if (!headRepo)
    err(1, 'unable to find git-ssb head repo')

  var open = u.issueStateBool(argv)

  u.getSbot(argv, function (err, sbot) {
    if (err) throw err
    sbot.whoami(function (err, feed) {
      if (err) throw err
      pull(
        PRs.init(sbot).list({
          repo: headRepo,
          open: open
        }),
        paramap(function (pr, cb) {
          getAbout(sbot, feed.id, pr.author, function (err, authorAbout) {
            pr.authorName = authorAbout.name
            cb(err, pr)
          })
        }, 8),
        pull.map(function (pr) {
          var state = pr.open ? 'open' : 'closed'
          return state + ' ' + pr.id + ' ' + '@' + pr.authorName + '\n' +
            '  ssb://' + pr.headRepo + ':' + pr.headBranch + ' ' +
            '→ ' + pr.baseBranch + '\n' +
            '  ' + u.formatTitle(pr.text, 77) + '\n'
        }),
        pull.drain(function (line) {
          console.log(line)
        }, function (err) {
          if (err) throw err
          process.exit(0)
        })
      )
    })
  })
}

