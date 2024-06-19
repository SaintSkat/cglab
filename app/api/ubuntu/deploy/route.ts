import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { exec } from 'child_process';
import { options } from '../../auth/[...nextauth]/options';
import { z } from 'zod';
import fs from 'fs';
import util from 'util';

const execPromise = util.promisify(exec);

// Регулярное выражение для проверки ссылки на репозиторий GitHub
const githubUrlRegex = /^(https:\/\/|git@)github\.com[/:][\w\-]+\/[\w\-]+(\.git)?$/;

const schema = z.object({
    source: z.string().regex(githubUrlRegex, { message: "Invalid GitHub URL" })
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(options);
        
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.formData();
        const source = data.get("source") as string;

        // Валидация входных данных
        const validationResult = schema.safeParse({ source });

        if (!validationResult.success) {
            return NextResponse.json({ error: validationResult.error.errors }, { status: 400 });
        }

        const username = session.user?.username;
        const password = session.user?.password;

        if (!username || !password) {
            return NextResponse.json({ error: "Missing user credentials" }, { status: 400 });
        }


        const userDir = `/var/www/${username}`;

        // Проверка, существует ли директория
        if (fs.existsSync(userDir)) {
            // Очистка директории
            console.log("Dirr exists: ", userDir)
            await execPromise(`rm -rf ${userDir}/.[!.]* ${userDir}/*`);
        } else {
            // Создание директории
            fs.mkdirSync(userDir, { recursive: true });
        }

        // Клонирование репозитория
        console.log("Source: ", source)
        exec(`git clone ${source} ${userDir}`);

        // Выполнение команд в директории пользователя
        console.log('npm install');
        const npmInstall = exec(`npm install`, { cwd: userDir });
        process.stdout.write(`npm install output: ${npmInstall.stdout}`);

        console.log('npm fund');
        const npmFund = exec(`npm fund`, { cwd: userDir });
        process.stdout.write(`npm fund output: ${npmFund.stdout}`);

        console.log('npm run build');
        const npmBuild = exec(`npm run build`, { cwd: userDir });
        process.stdout.write(`npm run build output: ${npmBuild.stdout}`);

        // Запуск сервера с использованием pm2
        process.stdout.write('pm2 start')
        const pm2 = exec(`pm2 start npm --name ${username}-server -- start`, { cwd: userDir });
        process.stdout.write(`pm2 start: ${pm2.stdout}`);

        process.stdout.write('all done')
        return NextResponse.json({ message: `Repository cloned successfully to ${userDir}` }, { status: 200 });
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 500 });
    }
}
