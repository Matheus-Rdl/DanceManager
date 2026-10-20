/* Executar no mongosh do banco DanceManager após backup. Não sobrescreve os demais campos. */
db.fields.updateOne({ collection: "activities", field: "activity_type" }, { $set: { optionsSource: "static", optionsEditable: true } });
db.fields.updateOne({ collection: "activities", field: "activity_active" }, { $set: { optionsSource: "static", optionsEditable: false } });
db.fields.updateOne({ collection: "activities", field: "activity_days" }, { $set: { optionsSource: "static", optionsEditable: false } });
db.fields.updateOne({ collection: "users", field: "user_type" }, { $set: { optionsSource: "static", optionsEditable: false } });
db.fields.updateOne({ collection: "users", field: "user_situation" }, { $set: { optionsSource: "static", optionsEditable: false } });
db.fields.updateOne({ collection: "activities", field: "activity_teachers" }, { $set: { optionsSource: "dynamic", optionsEditable: false } });
