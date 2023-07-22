import requests, time, json

with open("books.json", encoding = "utf-8") as file:
    books = json.load(file)

baseurl = "http://localhost:3333"

for abbrev, (title, length) in books.items():
    print(f"\nSending {title}[{abbrev}] with {length} chapters = ", end = "")
    response = requests.post(
        f"{baseurl}/books", 
        json = {
            "title": title,
            "abbrev": abbrev,
            "length": length
        })
    print(response.json())
    with open(f"chapters/{abbrev}.json", encoding = "utf-8") as book:
        chapters = json.load(book)

        for chapter in chapters:
            print(f"Populating {abbrev}:{chapter} = ", end = "")
            for verse, text in enumerate(chapters[chapter]):
                response = requests.post(
                f"{baseurl}/books/{abbrev}/verses/{chapter}/{verse + 1}/", json = {
                    "text": text
                })
                print(response.json())
            time.sleep(0.5)