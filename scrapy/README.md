# BibleComment scrapper

This scrapper was made because there're no bible api to get verses from ARA (Almeida Revista e Atualizada) version. So this scrapper connects to [abibliadigital api](https://www.abibliadigital.com.br/api) to get the chapters amount of each specified book in the script. So it will scrap the [Biblia.com.br](https://biblia.com.br/) to get the verses from each chapter and save it in a json file on the [chapters](./chapters/) folder.

## How to use
1. Install the requirements
```bash
pip install -r requirements.txt
```
2. You will need the Chrome to run the Selenium. Download the chrome driver from [here](https://chromedriver.chromium.org/downloads) and put it in this folder.
3. Get a token from [abibliadigital api](https://www.abibliadigital.com.br/api) and put it in the token variable in the [webscraping.py](./webscraping.py) file.
4. Write the books abbreviation that you want to scrap in the [webscraping.py](./webscraping.py) file.
5. Run the script
```bash
python webscraping.py
```
6. The verses will be saved in the [chapters](./chapters/) folder.
