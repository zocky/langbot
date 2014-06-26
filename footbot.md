# FOOTBOT

Footbot is an extension of langbot for WorldCup 2014, and is used in ##worldcup on freenode.

## Useful commands

The bot knows many commands and can tell you many things. If you need to use it for more than a few commands
at a time, please consider communicating with it through private messages.

### Match listings
Matches are ordered by time (not necessarily the same order as match IDs, which are shown in listings).
- `.next` - list next matches
- `.last` - list finished matches
- `.today` - list today's matches
- `.now` - list current matches
- `.team [code] games` - list matches for a team
- `.group [letter] games` - list matches for a group

### Other
- `.team [code|name]` - show information for a team
- `.group [letter]` - show information for a group

Use `.help` and `.help [command]` for more commands.

## Prediction game

You can predict scores for matches up to their kick-off time. Predictions are private until the match starts.

Three points are awarded for guessing the exact result, and one point is awarded for guessing the winner of the match. 

If two or more players have the same number of points, they are further ordered by their average "goal differential". This is
defined as `abs(predicted_1-actual_1)+abs(predicted_2-actual_2)`, for predicted and actual scores of teams 1 and 2.

You must be logged in with NickServ to join the game. Predictions and scores are kept and listed by account name, which may
or may not be the same as the user's current nick.

### Playing the game
- `/msg footbot .predict [match_id] [score1] [score2]` - predict the score for a match
- `/msg footbot .predict` - list future matches and your predictions for them, if any
- `/msg footbot .predicted` - list finished matches that you predicted with your predictions and points earned
- `.predict [match_id]` - show predictions for a match

### Displaying scores
- `.score` - list players by points earned
- `.score pg` - list players by average points per game - only players with 5 or more games are included
- `.score gd` - list players by average "goal differential" - only players with 5 or more games are included
- `.score me` - show your detailed score
- `.score [account_name]` - show detailed score for a player

## Admin commands
These can only be used by the bot's admins.
### Recording scores
- `.record` - list finished but unscored matches
- `.record [match_id] [score1] [score2]` - record the score for a match
- `.record [match_id] remove` - remove the score for a match
- `.tbd` - list matches for which at least one team hasn't been declared, with labels for undeclared teams
- `.tbd [label] [team_code]` - declare a tbd team
- `.tbd [label] remove` - remove a declared tbd team
### Admin admin
- `.admins` - list the bot's admins
- `.admins add [nick]` - add an admin
- `.admins remove [account_name]` - remove an admin (will not work for admins added in the config file)

