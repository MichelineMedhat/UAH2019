require("dotenv").config();
var nodemailer = require("nodemailer");
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://uah-2019.firebaseio.com"
});

// Get All Parents
const db = admin.firestore();
let parentsRef = db.collection("parents");
parentsRef.get().then(snapshot => {
  snapshot.forEach(parentDoc => sendEmail(parentDoc.data()));
});

var transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
});

function sendEmail(parent) {

  for (const child of parent.children) {
    var birthDate = child.dateOfBirth._seconds;
    var now = Math.floor(Date.now() / 1000);
    var diff = now - birthDate;

    var secondsPerDay = 24 * 60 * 60;
    var secondsPerMonth = 30 * secondsPerDay;
    var threshold = secondsPerDay / 2;

    var intervals = [2, 4, 6, 9, 12, 18];

    var firstReminderDays = 15;
    var secondReminderDays = 2;
    var firstReminderSeconds = firstReminderDays * secondsPerDay;
    var secondReminderSeconds = secondReminderDays * secondsPerDay;

    for (let i = 0; i < intervals.length; i++) {
      var interval = intervals[i] * secondsPerMonth;
      var diff1 = diff - interval - firstReminderSeconds;
      var diff2 = diff - interval - secondReminderSeconds;
      var isFirstReminder = 0 <= diff1 && diff1 <= threshold;
      var isSecondReminder = 0 <= diff2 && diff2 <= threshold;
      if (isFirstReminder || isSecondReminder) {
        // Send Email
        var doseNumber = i + 1;
        var monthFromBirth = intervals[i];
        var daysUntilVaccination = isFirstReminder
          ? firstReminderDays
          : secondReminderDays;

        var info = transporter.sendMail({
          from: process.env.EMAIL,
          to: parent.email,
          subject: `[Vaccination] Dose no. (${doseNumber}) to ${child.name}`,
          text: `${monthFromBirth} months from birth, the child should be vaccinated in ${daysUntilVaccination} days.`
        });
      }
    }
  }
}
