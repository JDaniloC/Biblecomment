import json, os

with open(os.path.join("chapters", "Genesis.json"), encoding="utf-8") as file:
    result = json.load(file)

for key in result.keys():
    print(f"Chapter {key}")
    for verse, text in result[key].items():
        print(verse, text)
    print("- - - - - - - - - - - - - - - - - - - -\n")