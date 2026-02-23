Preview/Temporary Deployment:
`firebase hosting:channel:deploy preview_name`

Production Commands:
`npm run deploy-staging`
above is a combination of 3 commands:

1. build:
   `ng build --configuration=production --aot --output-path=dist/review-teachercorner`
2. copy firebase.json:
   `copy staging-firebase.json firebase.json`
3. deploy to firebase:
   `firebase deploy --only hosting:review-teachercorner --project default`

Development Commands:
`npm run deploy-sandbox`
above is a combination of 3 commands:

1. build:
   `ng build --configuration=development --aot --output-path=dist/sandbox-teachercorner`
2. copy firebase.json:
   `copy sandbox-firebase.json firebase.json`
3. deploy to firebase:
   `firebase deploy --only hosting:sandbox-teachercorner --project backup`

Jigyaasa Commands:
`npm run deploy-jigyaasa`
above is a combination of 3 commands:

1. build:
   `ng build --configuration=jigyaasa --aot --output-path=dist/jigyasa-teachercorner`
2. copy firebase.json:
   `copy jigyaasa-firebase.json firebase.json`
3. deploy to firebase:
   `firebase deploy --only hosting:jigyasa-teachercorner --project jigyaasa`

All Commands:
`npm run deploy-all`
above is a combination of below commands:

1. `npm run deploy-sandbox`
2. `npm run deploy-staging`
3. `npm run deploy-jigyaasa`